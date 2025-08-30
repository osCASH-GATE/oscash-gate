const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../utils/config');
const BTCPayService = require('../services/btcpay');

/**
 * osCASH.me Mobile Gateway Authentication Middleware
 * 
 * Handles JWT token validation and BTCPay Server credentials
 * Optimized for mobile app authentication flow
 */

/**
 * JWT Authentication Middleware
 */
const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
        message: 'Please provide a valid authentication token'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token missing',
        message: 'Authentication token is required'
      });
    }

    // Verify JWT token
    jwt.verify(token, config.MOBILE_JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.logError(err, { 
          middleware: 'authenticateJWT',
          tokenPrefix: token.substring(0, 10) + '...'
        });

        let errorMessage = 'Invalid token';
        if (err.name === 'TokenExpiredError') {
          errorMessage = 'Token has expired';
        } else if (err.name === 'JsonWebTokenError') {
          errorMessage = 'Malformed token';
        }

        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: errorMessage
        });
      }

      // Validate required token fields
      if (!decoded.userId || !decoded.storeId || !decoded.apiKey) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token payload',
          message: 'Token missing required credentials'
        });
      }

      // Add user info to request
      req.user = {
        id: decoded.userId,
        storeId: decoded.storeId,
        apiKey: decoded.apiKey,
        serverUrl: decoded.serverUrl || config.BTCPAY_URL,
        tokenIssued: decoded.iat,
        tokenExpires: decoded.exp
      };

      logger.info('Authentication successful', {
        userId: req.user.id,
        storeId: req.user.storeId,
        endpoint: req.path
      });

      next();
    });

  } catch (error) {
    logger.logError(error, { middleware: 'authenticateJWT' });
    
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Failed to process authentication'
    });
  }
};

/**
 * BTCPay Server Connection Validation Middleware
 */
const validateBTCPayConnection = async (req, res, next) => {
  try {
    const { storeId, apiKey, serverUrl } = req.user;
    
    // Create BTCPay service instance
    const btcPayService = new BTCPayService(storeId, apiKey, serverUrl);
    
    // Test connection (with caching to avoid excessive API calls)
    const connectionKey = `btcpay_connection_${storeId}`;
    const lastCheck = req.app.locals.connectionCache?.[connectionKey];
    
    // Only check connection if not checked in last 5 minutes
    const now = Date.now();
    if (!lastCheck || (now - lastCheck.timestamp) > 5 * 60 * 1000) {
      try {
        const connectionTest = await btcPayService.testConnection();
        
        if (!connectionTest.connected) {
          logger.logError(new Error('BTCPay connection failed'), {
            middleware: 'validateBTCPayConnection',
            storeId: storeId,
            error: connectionTest.error
          });

          return res.status(503).json({
            success: false,
            error: 'BTCPay Server unavailable',
            message: connectionTest.error || 'Cannot connect to payment server',
            retryAfter: 60
          });
        }

        // Cache successful connection
        if (!req.app.locals.connectionCache) {
          req.app.locals.connectionCache = {};
        }
        req.app.locals.connectionCache[connectionKey] = {
          timestamp: now,
          connected: true
        };

        logger.info('BTCPay connection validated', {
          storeId: storeId,
          serverVersion: connectionTest.server?.version
        });

      } catch (connectionError) {
        logger.logError(connectionError, {
          middleware: 'validateBTCPayConnection',
          storeId: storeId
        });

        return res.status(503).json({
          success: false,
          error: 'Payment server connection failed',
          message: 'Unable to connect to BTCPay Server',
          retryAfter: 60
        });
      }
    }

    // Add BTCPay service to request for use in routes
    req.btcPayService = new BTCPayService(storeId, apiKey, serverUrl);
    
    next();

  } catch (error) {
    logger.logError(error, { middleware: 'validateBTCPayConnection' });
    
    return res.status(500).json({
      success: false,
      error: 'Connection validation failed',
      message: 'Unable to validate payment server connection'
    });
  }
};

/**
 * Rate Limiting by User ID
 */
const rateLimitByUser = (maxRequests = 50, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get user's request history
    let userHistory = userRequests.get(userId) || [];
    
    // Remove old requests outside the window
    userHistory = userHistory.filter(timestamp => timestamp > windowStart);
    
    // Check if user exceeded rate limit
    if (userHistory.length >= maxRequests) {
      logger.info('Rate limit exceeded', {
        userId: userId,
        requests: userHistory.length,
        maxRequests: maxRequests,
        windowMs: windowMs
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${maxRequests} requests per ${windowMs/60000} minutes.`,
        retryAfter: Math.ceil((userHistory[0] + windowMs - now) / 1000)
      });
    }

    // Add current request to history
    userHistory.push(now);
    userRequests.set(userId, userHistory);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const cutoff = now - windowMs;
      for (const [user, history] of userRequests.entries()) {
        const filteredHistory = history.filter(timestamp => timestamp > cutoff);
        if (filteredHistory.length === 0) {
          userRequests.delete(user);
        } else {
          userRequests.set(user, filteredHistory);
        }
      }
    }

    next();
  };
};

/**
 * Generate JWT token for mobile authentication
 */
const generateMobileToken = (userId, storeId, apiKey, serverUrl = null) => {
  try {
    const payload = {
      userId: userId,
      storeId: storeId,
      apiKey: apiKey,
      serverUrl: serverUrl || config.BTCPAY_URL,
      type: 'mobile',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      payload,
      config.MOBILE_JWT_SECRET,
      { 
        expiresIn: config.MOBILE_JWT_EXPIRES_IN,
        issuer: 'oscash-mobile-gateway'
      }
    );

    logger.info('Mobile token generated', {
      userId: userId,
      storeId: storeId,
      expiresIn: config.MOBILE_JWT_EXPIRES_IN
    });

    return {
      token: token,
      expiresIn: config.MOBILE_JWT_EXPIRES_IN,
      type: 'Bearer'
    };

  } catch (error) {
    logger.logError(error, { 
      method: 'generateMobileToken',
      userId: userId 
    });
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * Verify BTCPay credentials and generate token
 */
const authenticateCredentials = async (storeId, apiKey, serverUrl = null) => {
  try {
    const btcPayService = new BTCPayService(storeId, apiKey, serverUrl);
    const connectionTest = await btcPayService.testConnection();
    
    if (!connectionTest.connected) {
      throw new Error(connectionTest.error || 'Invalid credentials');
    }

    // Generate unique user ID based on store ID and server
    const userId = `${storeId}_${Buffer.from(serverUrl || config.BTCPAY_URL).toString('base64').slice(0, 8)}`;
    
    const tokenData = generateMobileToken(userId, storeId, apiKey, serverUrl);
    
    return {
      success: true,
      auth: tokenData,
      server: connectionTest.server,
      store: connectionTest.store
    };

  } catch (error) {
    logger.logError(error, { 
      method: 'authenticateCredentials',
      storeId: storeId 
    });
    
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
};

// Export middleware functions
module.exports = {
  authenticateJWT,
  validateBTCPayConnection,
  rateLimitByUser,
  generateMobileToken,
  authenticateCredentials
};