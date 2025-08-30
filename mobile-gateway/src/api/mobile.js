const express = require('express');
const { body, query, validationResult } = require('express-validator');
const BTCPayService = require('../services/btcpay');
const QRService = require('../services/qr');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * osCASH.me Mobile API Routes
 * 
 * Simplified, mobile-optimized endpoints for osCASH.me app
 */

/**
 * GET /api/v1/mobile/status
 * Get overall mobile app status and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const btcPayService = new BTCPayService(req.user.storeId, req.user.apiKey);
    
    const [serverInfo, storeInfo, walletBalance] = await Promise.all([
      btcPayService.getServerInfo(),
      btcPayService.getStoreInfo(),
      btcPayService.getWalletBalance().catch(() => null) // Optional, might not be configured
    ]);

    const status = {
      // App-level status
      app: {
        name: 'osCASH.me',
        version: '1.0.0',
        build: 'v7.53.5-02-dev',
        gatewayVersion: require('../../package.json').version
      },
      
      // Server connection status
      server: {
        connected: true,
        url: serverInfo.url || 'Connected',
        version: serverInfo.version,
        network: serverInfo.network || 'mainnet',
        uptime: serverInfo.uptime
      },
      
      // Store status
      store: {
        id: storeInfo.id,
        name: storeInfo.name || 'osCASH.me Store',
        configured: !!storeInfo.id,
        defaultCurrency: storeInfo.defaultCurrency || 'BTC'
      },
      
      // Wallet status (if available)
      wallet: walletBalance ? {
        available: true,
        balance: walletBalance.balance,
        confirmedBalance: walletBalance.confirmedBalance,
        unconfirmedBalance: walletBalance.unconfirmedBalance,
        currency: walletBalance.currency || 'BTC'
      } : {
        available: false,
        message: 'Wallet not configured'
      },
      
      // Feature availability
      features: {
        payments: true,
        lightning: storeInfo.lightningEnabled || false,
        qrCodes: true,
        realTimeUpdates: true,
        multiCurrency: true
      },
      
      // Quick stats for dashboard
      stats: {
        totalPayments: 0, // TODO: Get from BTCPay
        totalVolume: '0.00000000 BTC',
        successRate: '100%'
      }
    };

    logger.info('Mobile status requested', {
      userId: req.user.id,
      storeId: req.user.storeId
    });

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, {
      endpoint: '/mobile/status',
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get mobile status',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/mobile/quick-payment
 * Create a quick payment QR code for mobile-to-mobile payments
 */
router.post('/quick-payment', [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['BTC', 'SATS', 'USD', 'EUR']).withMessage('Unsupported currency'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description too long'),
  body('expiry').optional().isInt({ min: 60, max: 86400 }).withMessage('Expiry must be between 1 minute and 24 hours')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency, description, expiry } = req.body;
    const btcPayService = new BTCPayService(req.user.storeId, req.user.apiKey);
    
    // Create BTCPay invoice
    const invoice = await btcPayService.createInvoice({
      amount: amount,
      currency: currency,
      orderId: `mobile-${Date.now()}`,
      description: description || 'osCASH.me mobile payment',
      expiry: expiry || 3600, // 1 hour default
      metadata: {
        source: 'mobile-app',
        userId: req.user.id,
        quickPayment: true
      }
    });
    
    // Generate QR code
    const qrCode = await QRService.generatePaymentQR(invoice.checkoutLink);
    
    // Mobile-optimized response
    const mobilePayment = {
      id: invoice.id,
      amount: {
        requested: amount,
        currency: currency,
        btcAmount: invoice.btcAmount,
        btcPrice: invoice.btcPrice
      },
      qr: {
        data: invoice.checkoutLink,
        image: qrCode.dataURL,
        text: qrCode.text
      },
      payment: {
        address: invoice.addresses?.BTC || null,
        lightningInvoice: invoice.addresses?.LightningNetwork || null,
        uri: invoice.btcUri
      },
      status: {
        state: invoice.status,
        expiresAt: invoice.expirationTime,
        createdAt: invoice.creationTime
      },
      links: {
        checkout: invoice.checkoutLink,
        status: `/api/v1/payments/${invoice.id}/status`
      }
    };

    logger.logPayment('created', invoice.id, {
      amount: amount,
      currency: currency,
      userId: req.user.id,
      type: 'quick-payment'
    });

    res.status(201).json({
      success: true,
      data: mobilePayment,
      message: 'Quick payment created successfully'
    });
    
  } catch (error) {
    logger.logError(error, {
      endpoint: '/mobile/quick-payment',
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to create quick payment',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/mobile/recent-activity
 * Get recent payment activity for mobile dashboard
 */
router.get('/recent-activity', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const btcPayService = new BTCPayService(req.user.storeId, req.user.apiKey);
    
    const invoices = await btcPayService.getRecentInvoices(limit);
    
    // Transform to mobile-friendly format
    const activity = invoices.map(invoice => ({
      id: invoice.id,
      type: 'payment',
      status: invoice.status,
      amount: {
        value: invoice.amount,
        currency: invoice.currency,
        btcValue: invoice.btcAmount
      },
      description: invoice.metadata?.description || 'Payment',
      timestamp: invoice.creationTime,
      direction: 'incoming', // All BTCPay invoices are incoming
      confirmations: invoice.confirmations || 0,
      isQuickPayment: invoice.metadata?.quickPayment || false
    }));

    res.json({
      success: true,
      data: {
        activity: activity,
        total: activity.length,
        hasMore: activity.length === limit
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, {
      endpoint: '/mobile/recent-activity',
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get recent activity',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/mobile/scan-payment
 * Process scanned QR code for payment
 */
router.post('/scan-payment', [
  body('qrData').notEmpty().withMessage('QR data is required'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { qrData, amount } = req.body;
    
    // Parse QR code data
    const paymentInfo = QRService.parsePaymentQR(qrData);
    
    if (!paymentInfo.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment QR code',
        message: paymentInfo.error
      });
    }

    const response = {
      success: true,
      data: {
        type: paymentInfo.type,
        recipient: {
          address: paymentInfo.address,
          amount: paymentInfo.amount || amount,
          currency: paymentInfo.currency || 'BTC'
        },
        message: paymentInfo.message,
        isLightning: paymentInfo.isLightning,
        isValidAmount: !!(paymentInfo.amount || amount),
        nextStep: paymentInfo.amount ? 'confirm' : 'enter_amount'
      }
    };

    logger.info('QR payment scanned', {
      userId: req.user.id,
      type: paymentInfo.type,
      hasAmount: !!paymentInfo.amount
    });

    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      endpoint: '/mobile/scan-payment',
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process scanned payment',
      message: error.message
    });
  }
});

module.exports = router;