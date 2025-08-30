const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../utils/config');
const BTCPayService = require('../services/btcpay');

/**
 * osCASH.me Mobile Gateway WebSocket Handler
 * 
 * Provides real-time payment updates and notifications to mobile clients
 * Optimized for mobile battery life with smart heartbeat and connection management
 */
class WebSocketHandler {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Map(); // userId -> { ws, user, subscriptions, lastHeartbeat }
    this.paymentSubscriptions = new Map(); // paymentId -> Set of userIds
    this.heartbeatInterval = null;
    this.cleanupInterval = null;
  }

  /**
   * Initialize WebSocket server
   */
  initialize() {
    this.setupConnectionHandler();
    this.setupHeartbeat();
    this.setupCleanup();
    
    logger.info('WebSocket handler initialized', {
      maxConnections: config.WEBSOCKET_MAX_CONNECTIONS,
      heartbeatInterval: config.WEBSOCKET_HEARTBEAT_INTERVAL
    });
  }

  /**
   * Setup WebSocket connection handler
   */
  setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      logger.logWebSocket('connection_attempt', 'new', {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      // Handle authentication
      ws.on('message', async (message) => {
        try {
          await this.handleMessage(ws, message);
        } catch (error) {
          logger.logError(error, { 
            event: 'websocket_message',
            clientConnected: ws.readyState === WebSocket.OPEN
          });
          this.sendError(ws, 'Message processing failed');
        }
      });

      // Handle connection close
      ws.on('close', (code, reason) => {
        this.handleDisconnection(ws, code, reason);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        logger.logError(error, { event: 'websocket_error' });
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'welcome',
        message: 'osCASH.me Mobile Gateway WebSocket',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws, message) {
    let data;
    
    try {
      data = JSON.parse(message);
    } catch (error) {
      this.sendError(ws, 'Invalid JSON format');
      return;
    }

    const { type, payload } = data;

    switch (type) {
      case 'authenticate':
        await this.handleAuthentication(ws, payload);
        break;
        
      case 'subscribe_payment':
        await this.handlePaymentSubscription(ws, payload);
        break;
        
      case 'unsubscribe_payment':
        this.handlePaymentUnsubscription(ws, payload);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(ws);
        break;
        
      case 'get_status':
        await this.handleStatusRequest(ws);
        break;
        
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle client authentication
   */
  async handleAuthentication(ws, payload) {
    try {
      const { token } = payload;
      
      if (!token) {
        this.sendError(ws, 'Authentication token required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.MOBILE_JWT_SECRET);
      
      if (!decoded.userId || !decoded.storeId || !decoded.apiKey) {
        this.sendError(ws, 'Invalid token payload');
        return;
      }

      // Test BTCPay connection
      const btcPayService = new BTCPayService(
        decoded.storeId, 
        decoded.apiKey, 
        decoded.serverUrl
      );
      
      const connectionTest = await btcPayService.testConnection();
      if (!connectionTest.connected) {
        this.sendError(ws, 'BTCPay Server connection failed');
        return;
      }

      // Check connection limits
      if (this.clients.size >= config.WEBSOCKET_MAX_CONNECTIONS) {
        this.sendError(ws, 'Maximum connections reached');
        return;
      }

      // Store authenticated client
      const clientInfo = {
        ws: ws,
        user: {
          id: decoded.userId,
          storeId: decoded.storeId,
          apiKey: decoded.apiKey,
          serverUrl: decoded.serverUrl
        },
        subscriptions: new Set(),
        lastHeartbeat: Date.now(),
        connectedAt: Date.now()
      };

      this.clients.set(decoded.userId, clientInfo);

      // Send authentication success
      this.sendMessage(ws, {
        type: 'authenticated',
        user: {
          id: decoded.userId,
          storeId: decoded.storeId
        },
        server: connectionTest.server,
        timestamp: new Date().toISOString()
      });

      logger.logWebSocket('authenticated', decoded.userId, {
        storeId: decoded.storeId,
        totalConnections: this.clients.size
      });

    } catch (error) {
      logger.logError(error, { method: 'handleAuthentication' });
      
      let errorMessage = 'Authentication failed';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token';
      }
      
      this.sendError(ws, errorMessage);
    }
  }

  /**
   * Handle payment subscription
   */
  async handlePaymentSubscription(ws, payload) {
    const client = this.getClientByWebSocket(ws);
    if (!client) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    const { paymentId } = payload;
    if (!paymentId) {
      this.sendError(ws, 'Payment ID required');
      return;
    }

    try {
      // Verify payment belongs to user's store
      const btcPayService = new BTCPayService(
        client.user.storeId,
        client.user.apiKey,
        client.user.serverUrl
      );

      const invoice = await btcPayService.getInvoice(paymentId);
      
      // Add subscription
      client.subscriptions.add(paymentId);
      
      if (!this.paymentSubscriptions.has(paymentId)) {
        this.paymentSubscriptions.set(paymentId, new Set());
      }
      this.paymentSubscriptions.get(paymentId).add(client.user.id);

      // Send current payment status
      this.sendMessage(ws, {
        type: 'payment_status',
        paymentId: paymentId,
        status: invoice.status,
        confirmations: invoice.confirmations,
        timestamp: new Date().toISOString()
      });

      logger.logWebSocket('payment_subscribed', client.user.id, {
        paymentId: paymentId,
        subscriptions: client.subscriptions.size
      });

    } catch (error) {
      logger.logError(error, { 
        method: 'handlePaymentSubscription',
        paymentId: paymentId,
        userId: client.user.id
      });
      this.sendError(ws, 'Failed to subscribe to payment');
    }
  }

  /**
   * Handle payment unsubscription
   */
  handlePaymentUnsubscription(ws, payload) {
    const client = this.getClientByWebSocket(ws);
    if (!client) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    const { paymentId } = payload;
    if (!paymentId) {
      this.sendError(ws, 'Payment ID required');
      return;
    }

    // Remove subscription
    client.subscriptions.delete(paymentId);
    
    const paymentSubs = this.paymentSubscriptions.get(paymentId);
    if (paymentSubs) {
      paymentSubs.delete(client.user.id);
      if (paymentSubs.size === 0) {
        this.paymentSubscriptions.delete(paymentId);
      }
    }

    this.sendMessage(ws, {
      type: 'payment_unsubscribed',
      paymentId: paymentId,
      timestamp: new Date().toISOString()
    });

    logger.logWebSocket('payment_unsubscribed', client.user.id, {
      paymentId: paymentId
    });
  }

  /**
   * Handle heartbeat
   */
  handleHeartbeat(ws) {
    const client = this.getClientByWebSocket(ws);
    if (client) {
      client.lastHeartbeat = Date.now();
      
      this.sendMessage(ws, {
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle status request
   */
  async handleStatusRequest(ws) {
    const client = this.getClientByWebSocket(ws);
    if (!client) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    try {
      const btcPayService = new BTCPayService(
        client.user.storeId,
        client.user.apiKey,
        client.user.serverUrl
      );

      const [serverInfo, storeInfo] = await Promise.all([
        btcPayService.getServerInfo(),
        btcPayService.getStoreInfo()
      ]);

      this.sendMessage(ws, {
        type: 'status',
        server: serverInfo,
        store: storeInfo,
        connection: {
          connectedAt: client.connectedAt,
          subscriptions: client.subscriptions.size,
          lastHeartbeat: client.lastHeartbeat
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, { method: 'handleStatusRequest' });
      this.sendError(ws, 'Failed to get status');
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(ws, code, reason) {
    const client = this.getClientByWebSocket(ws);
    
    if (client) {
      // Remove all payment subscriptions
      for (const paymentId of client.subscriptions) {
        const paymentSubs = this.paymentSubscriptions.get(paymentId);
        if (paymentSubs) {
          paymentSubs.delete(client.user.id);
          if (paymentSubs.size === 0) {
            this.paymentSubscriptions.delete(paymentId);
          }
        }
      }

      this.clients.delete(client.user.id);

      logger.logWebSocket('disconnected', client.user.id, {
        code: code,
        reason: reason?.toString(),
        duration: Date.now() - client.connectedAt,
        subscriptions: client.subscriptions.size
      });
    }
  }

  /**
   * Broadcast payment status update
   */
  broadcastPaymentUpdate(paymentId, status) {
    const subscribers = this.paymentSubscriptions.get(paymentId);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message = {
      type: 'payment_update',
      paymentId: paymentId,
      status: status.status,
      confirmations: status.confirmations,
      paid: status.paid,
      expired: status.expired,
      timestamp: new Date().toISOString()
    };

    let broadcastCount = 0;
    
    for (const userId of subscribers) {
      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
        broadcastCount++;
      }
    }

    logger.logWebSocket('payment_broadcast', paymentId, {
      subscribers: subscribers.size,
      delivered: broadcastCount,
      status: status.status
    });
  }

  /**
   * Setup heartbeat system
   */
  setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = config.WEBSOCKET_HEARTBEAT_INTERVAL * 2;

      for (const [userId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client is stale
          if (now - client.lastHeartbeat > staleThreshold) {
            logger.logWebSocket('heartbeat_timeout', userId, {
              lastHeartbeat: client.lastHeartbeat,
              threshold: staleThreshold
            });
            client.ws.terminate();
            continue;
          }

          // Send heartbeat ping
          this.sendMessage(client.ws, {
            type: 'heartbeat_ping',
            timestamp: new Date().toISOString()
          });
        }
      }
    }, config.WEBSOCKET_HEARTBEAT_INTERVAL);
  }

  /**
   * Setup cleanup system
   */
  setupCleanup() {
    this.cleanupInterval = setInterval(() => {
      // Remove closed connections
      for (const [userId, client] of this.clients) {
        if (client.ws.readyState !== WebSocket.OPEN) {
          this.clients.delete(userId);
          
          // Clean up subscriptions
          for (const paymentId of client.subscriptions) {
            const paymentSubs = this.paymentSubscriptions.get(paymentId);
            if (paymentSubs) {
              paymentSubs.delete(userId);
              if (paymentSubs.size === 0) {
                this.paymentSubscriptions.delete(paymentId);
              }
            }
          }
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Send message to WebSocket client
   */
  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.logError(error, { method: 'sendMessage' });
      }
    }
  }

  /**
   * Send error to WebSocket client
   */
  sendError(ws, errorMessage) {
    this.sendMessage(ws, {
      type: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get client by WebSocket instance
   */
  getClientByWebSocket(ws) {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return null;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      totalSubscriptions: this.paymentSubscriptions.size,
      activePayments: Array.from(this.paymentSubscriptions.keys()),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Shutdown WebSocket handler
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, {
          type: 'shutdown',
          message: 'Server shutting down',
          timestamp: new Date().toISOString()
        });
        client.ws.close();
      }
    }

    logger.info('WebSocket handler shutdown completed');
  }
}

module.exports = WebSocketHandler;