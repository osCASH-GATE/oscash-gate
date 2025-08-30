const express = require('express');
const { body, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * osCASH.me Mobile Payment API Routes
 * 
 * Simplified payment management endpoints for mobile apps
 */

/**
 * GET /api/v1/payments/:id
 * Get payment details by ID
 */
router.get('/:id', [
  param('id').notEmpty().withMessage('Payment ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const paymentId = req.params.id;
    const invoice = await req.btcPayService.getInvoice(paymentId);

    const payment = {
      id: invoice.id,
      status: {
        state: invoice.status,
        paid: ['Settled', 'Processing'].includes(invoice.status),
        expired: invoice.status === 'Expired',
        confirmations: invoice.confirmations
      },
      amount: {
        requested: invoice.amount,
        currency: invoice.currency,
        btcAmount: invoice.btcAmount,
        btcPrice: invoice.btcPrice
      },
      payment: {
        addresses: invoice.addresses,
        btcUri: invoice.btcUri,
        checkoutLink: invoice.checkoutLink
      },
      timing: {
        createdAt: invoice.creationTime,
        expiresAt: invoice.expirationTime
      },
      metadata: invoice.metadata || {}
    };

    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/payments/:id',
      paymentId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get payment details',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/payments/:id/status
 * Get payment status (lightweight endpoint for polling)
 */
router.get('/:id/status', [
  param('id').notEmpty().withMessage('Payment ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const paymentId = req.params.id;
    const status = await req.btcPayService.checkPaymentStatus(paymentId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/payments/:id/status',
      paymentId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get payment status',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/payments
 * Create a new payment
 */
router.post('/', [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['BTC', 'SATS', 'USD', 'EUR']).withMessage('Unsupported currency'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description too long'),
  body('orderId').optional().isLength({ max: 100 }).withMessage('Order ID too long'),
  body('expiry').optional().isInt({ min: 60, max: 86400 }).withMessage('Expiry must be between 1 minute and 24 hours'),
  body('redirectURL').optional().isURL().withMessage('Invalid redirect URL'),
  body('closeURL').optional().isURL().withMessage('Invalid close URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      amount, 
      currency, 
      description, 
      orderId, 
      expiry,
      redirectURL,
      closeURL
    } = req.body;

    const invoice = await req.btcPayService.createInvoice({
      amount: amount,
      currency: currency,
      orderId: orderId || `payment-${Date.now()}`,
      description: description || 'osCASH.me payment',
      expiry: expiry || 3600,
      redirectURL: redirectURL,
      closeURL: closeURL,
      metadata: {
        source: 'mobile-gateway',
        userId: req.user.id,
        createdAt: new Date().toISOString()
      }
    });

    const payment = {
      id: invoice.id,
      amount: {
        requested: amount,
        currency: currency,
        btcAmount: invoice.btcAmount,
        btcPrice: invoice.btcPrice
      },
      payment: {
        addresses: invoice.addresses,
        btcUri: invoice.btcUri,
        checkoutLink: invoice.checkoutLink
      },
      status: {
        state: invoice.status,
        expiresAt: invoice.expirationTime,
        createdAt: invoice.creationTime
      },
      links: {
        checkout: invoice.checkoutLink,
        status: `/api/v1/payments/${invoice.id}/status`,
        details: `/api/v1/payments/${invoice.id}`
      }
    };

    logger.logPayment('created', invoice.id, {
      amount: amount,
      currency: currency,
      userId: req.user.id,
      source: 'mobile-gateway'
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/payments',
      userId: req.user.id,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create payment',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/payments/:id/cancel
 * Cancel a payment (if possible)
 */
router.post('/:id/cancel', [
  param('id').notEmpty().withMessage('Payment ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const paymentId = req.params.id;
    
    // Check current status
    const currentStatus = await req.btcPayService.checkPaymentStatus(paymentId);
    
    if (currentStatus.paid) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel paid payment',
        message: 'Payment has already been settled'
      });
    }

    if (currentStatus.expired) {
      return res.status(400).json({
        success: false,
        error: 'Payment already expired',
        message: 'Payment has already expired'
      });
    }

    // For BTCPay, we can't directly cancel invoices via API
    // But we can mark them as archived or provide guidance
    logger.logPayment('cancel_requested', paymentId, {
      userId: req.user.id,
      currentStatus: currentStatus.status
    });

    res.json({
      success: true,
      data: {
        id: paymentId,
        message: 'Payment cancellation requested',
        note: 'Invoice will expire naturally at scheduled time',
        expiresAt: currentStatus.timestamp
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/payments/:id/cancel',
      paymentId: req.params.id,
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to cancel payment',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/payments
 * List recent payments with filtering
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status; // 'paid', 'pending', 'expired'

    const invoices = await req.btcPayService.getRecentInvoices(limit + offset);
    
    // Apply filtering and pagination
    let filteredInvoices = invoices;
    
    if (status) {
      filteredInvoices = invoices.filter(invoice => {
        switch (status) {
          case 'paid':
            return ['Settled', 'Processing'].includes(invoice.status);
          case 'pending':
            return ['New', 'Processing'].includes(invoice.status);
          case 'expired':
            return invoice.status === 'Expired';
          default:
            return true;
        }
      });
    }

    // Apply pagination
    const paginatedInvoices = filteredInvoices.slice(offset, offset + limit);
    
    // Transform to mobile format
    const payments = paginatedInvoices.map(invoice => ({
      id: invoice.id,
      status: {
        state: invoice.status,
        paid: ['Settled', 'Processing'].includes(invoice.status),
        confirmations: invoice.confirmations
      },
      amount: {
        value: invoice.amount,
        currency: invoice.currency,
        btcValue: invoice.btcAmount
      },
      description: invoice.description,
      createdAt: invoice.creationTime,
      isQuickPayment: invoice.metadata?.quickPayment || false
    }));

    res.json({
      success: true,
      data: {
        payments: payments,
        pagination: {
          total: filteredInvoices.length,
          limit: limit,
          offset: offset,
          hasMore: filteredInvoices.length > offset + limit
        },
        filters: {
          status: status || 'all'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/payments',
      userId: req.user.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get payments',
      message: error.message
    });
  }
});

module.exports = router;