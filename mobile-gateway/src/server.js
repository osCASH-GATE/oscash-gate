const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

// Import configurations and middleware
const config = require('./utils/config');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import API routes
const authApi = require('./api/auth');
const mobileApi = require('./api/mobile');
const paymentsApi = require('./api/payments');
const walletApi = require('./api/wallet');

// Import WebSocket handler
const WebSocketHandler = require('./websocket/handler');

/**
 * osCASH.me Mobile API Gateway
 * 
 * Provides mobile-optimized API interface to BTCPay Server
 * with real-time WebSocket updates and simplified endpoints
 */
class MobileGatewayServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.wsHandler = new WebSocketHandler(this.wss);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration for mobile apps
    this.app.use(cors({
      origin: config.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: config.RATE_LIMIT_MAX_REQUESTS, // limit each IP to max requests per windowMs
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        service: 'osCASH.me Mobile Gateway'
      });
    });

    // API v1 routes
    this.app.use('/api/v1/auth', authApi); // No auth required for auth endpoints
    this.app.use('/api/v1/mobile', authMiddleware.authenticateJWT, authMiddleware.validateBTCPayConnection, mobileApi);
    this.app.use('/api/v1/payments', authMiddleware.authenticateJWT, authMiddleware.validateBTCPayConnection, paymentsApi);
    this.app.use('/api/v1/wallet', authMiddleware.authenticateJWT, authMiddleware.validateBTCPayConnection, walletApi);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'osCASH.me Mobile API Gateway',
        version: require('../package.json').version,
        description: 'Mobile-optimized API interface for osCASH.me GATE',
        endpoints: {
          health: '/health',
          auth: '/api/v1/auth',
          mobile: '/api/v1/mobile',
          payments: '/api/v1/payments',
          wallet: '/api/v1/wallet',
          websocket: `ws://${req.get('host')}/ws`
        },
        documentation: 'https://docs.osCASH.me/mobile-gateway'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupWebSocket() {
    logger.info('Setting up WebSocket server for real-time updates');
    this.wsHandler.initialize();
  }

  setupErrorHandling() {
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('SIGTERM');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('SIGTERM');
    });

    // Handle termination signals
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  start() {
    const port = config.PORT || 3000;
    
    this.server.listen(port, '0.0.0.0', () => {
      logger.info(`osCASH.me Mobile Gateway started on port ${port}`);
      logger.info(`Health check: http://localhost:${port}/health`);
      logger.info(`API Documentation: http://localhost:${port}/`);
      logger.info(`WebSocket endpoint: ws://localhost:${port}/ws`);
    });
  }

  gracefulShutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    this.server.close(() => {
      logger.info('HTTP server closed');
      
      // Close WebSocket server
      this.wss.close(() => {
        logger.info('WebSocket server closed');
        process.exit(0);
      });
    });

    // Force close server after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const gateway = new MobileGatewayServer();
  gateway.start();
}

module.exports = MobileGatewayServer;