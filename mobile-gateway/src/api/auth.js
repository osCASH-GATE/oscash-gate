const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateCredentials } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * osCASH.me Mobile Authentication API Routes
 * 
 * Handles mobile app authentication with BTCPay Server credentials
 */

/**
 * POST /api/v1/auth/login
 * Authenticate with BTCPay Server credentials and get JWT token
 */
router.post('/login', [
  body('storeId').notEmpty().withMessage('Store ID is required'),
  body('apiKey').notEmpty().withMessage('API Key is required'),
  body('serverUrl').optional().isURL().withMessage('Invalid server URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { storeId, apiKey, serverUrl } = req.body;
    
    logger.info('Authentication attempt', {
      storeId: storeId,
      serverUrl: serverUrl || 'default',
      ip: req.ip
    });

    const authResult = await authenticateCredentials(storeId, apiKey, serverUrl);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: authResult.error
      });
    }

    logger.info('Authentication successful', {
      storeId: storeId,
      serverName: authResult.store.name
    });

    res.json({
      success: true,
      data: {
        auth: authResult.auth,
        server: {
          url: authResult.server.url,
          version: authResult.server.version,
          network: authResult.server.network
        },
        store: {
          id: authResult.store.id,
          name: authResult.store.name,
          currency: authResult.store.defaultCurrency
        }
      },
      message: 'Authentication successful'
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/auth/login',
      storeId: req.body.storeId
    });

    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Unable to process authentication request'
    });
  }
});

/**
 * POST /api/v1/auth/test-connection
 * Test BTCPay Server connection without creating token
 */
router.post('/test-connection', [
  body('storeId').notEmpty().withMessage('Store ID is required'),
  body('apiKey').notEmpty().withMessage('API Key is required'),
  body('serverUrl').optional().isURL().withMessage('Invalid server URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { storeId, apiKey, serverUrl } = req.body;
    
    const BTCPayService = require('../services/btcpay');
    const btcPayService = new BTCPayService(storeId, apiKey, serverUrl);
    
    const connectionTest = await btcPayService.testConnection();
    
    if (!connectionTest.connected) {
      return res.status(400).json({
        success: false,
        error: 'Connection failed',
        message: connectionTest.error
      });
    }

    res.json({
      success: true,
      data: {
        connected: true,
        server: connectionTest.server,
        store: connectionTest.store
      },
      message: 'Connection test successful'
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/auth/test-connection',
      storeId: req.body.storeId
    });

    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error.message
    });
  }
});

module.exports = router;