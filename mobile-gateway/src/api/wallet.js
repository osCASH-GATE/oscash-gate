const express = require('express');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * osCASH.me Mobile Wallet API Routes
 * 
 * Simplified wallet information and basic operations for mobile apps
 */

/**
 * GET /api/v1/wallet/balance
 * Get wallet balance information
 */
router.get('/balance', async (req, res) => {
  try {
    const walletBalance = await req.btcPayService.getWalletBalance();
    
    if (!walletBalance) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not configured',
        message: 'No wallet configured for this store'
      });
    }

    const balance = {
      total: walletBalance.balance,
      confirmed: walletBalance.confirmedBalance,
      unconfirmed: walletBalance.unconfirmedBalance,
      currency: walletBalance.currency,
      formatted: {
        total: `${walletBalance.balance} ${walletBalance.currency}`,
        confirmed: `${walletBalance.confirmedBalance} ${walletBalance.currency}`,
        unconfirmed: `${walletBalance.unconfirmedBalance} ${walletBalance.currency}`
      }
    };

    res.json({
      success: true,
      data: balance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/wallet/balance',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get wallet balance',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/wallet/info
 * Get wallet configuration information
 */
router.get('/info', async (req, res) => {
  try {
    const [storeInfo, walletBalance] = await Promise.all([
      req.btcPayService.getStoreInfo(),
      req.btcPayService.getWalletBalance().catch(() => null)
    ]);

    const walletInfo = {
      configured: !!walletBalance,
      store: {
        id: storeInfo.id,
        name: storeInfo.name,
        defaultCurrency: storeInfo.defaultCurrency
      },
      features: {
        onChain: storeInfo.onChainEnabled,
        lightning: storeInfo.lightningEnabled,
        multiCurrency: true
      },
      balance: walletBalance ? {
        available: true,
        total: walletBalance.balance,
        currency: walletBalance.currency
      } : {
        available: false,
        message: 'Wallet not configured'
      }
    };

    res.json({
      success: true,
      data: walletInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/wallet/info',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get wallet information',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/wallet/addresses
 * Get receive addresses (for display purposes only)
 */
router.get('/addresses', async (req, res) => {
  try {
    // Note: This is a simplified endpoint
    // In production, you might want to generate fresh addresses
    const storeInfo = await req.btcPayService.getStoreInfo();
    
    // Create a test invoice to get current addresses
    const testInvoice = await req.btcPayService.createInvoice({
      amount: 0.00000001, // 1 satoshi
      currency: 'BTC',
      orderId: `address-test-${Date.now()}`,
      description: 'Address generation test',
      expiry: 60, // 1 minute
      metadata: {
        addressTest: true,
        userId: req.user.id
      }
    });

    const addresses = {
      onchain: testInvoice.addresses?.BTC || null,
      lightning: testInvoice.addresses?.LightningNetwork || null,
      checkoutLink: testInvoice.checkoutLink,
      note: 'Addresses generated for display purposes'
    };

    res.json({
      success: true,
      data: addresses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/wallet/addresses',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get wallet addresses',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/wallet/validate-address
 * Validate a Bitcoin address format
 */
router.post('/validate-address', [
  body('address').notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { address } = req.body;
    
    // Basic address validation using QR service
    const QRService = require('../services/qr');
    const isValid = QRService.isBitcoinAddress(address);
    
    let addressType = 'unknown';
    let network = 'unknown';
    
    if (isValid) {
      // Determine address type
      if (address.startsWith('1')) {
        addressType = 'legacy';
        network = 'mainnet';
      } else if (address.startsWith('3')) {
        addressType = 'segwit';
        network = 'mainnet';
      } else if (address.startsWith('bc1')) {
        addressType = 'bech32';
        network = 'mainnet';
      } else if (address.startsWith('m') || address.startsWith('n') || address.startsWith('2')) {
        addressType = 'testnet';
        network = 'testnet';
      } else if (address.startsWith('tb1')) {
        addressType = 'bech32';
        network = 'testnet';
      }
    }

    const validation = {
      address: address,
      valid: isValid,
      type: addressType,
      network: network,
      length: address.length
    };

    res.json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/wallet/validate-address',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to validate address',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/wallet/transactions
 * Get recent wallet transactions (simplified view)
 */
router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent invoices as transaction history
    const invoices = await req.btcPayService.getRecentInvoices(limit);
    
    // Transform to transaction format
    const transactions = invoices
      .filter(invoice => ['Settled', 'Processing'].includes(invoice.status))
      .map(invoice => ({
        id: invoice.id,
        type: 'receive',
        status: invoice.status.toLowerCase(),
        amount: {
          value: invoice.amount,
          currency: invoice.currency,
          btcValue: invoice.btcAmount
        },
        confirmations: invoice.confirmations || 0,
        timestamp: invoice.creationTime,
        description: invoice.description || 'Payment received'
      }));

    res.json({
      success: true,
      data: {
        transactions: transactions,
        total: transactions.length,
        note: 'Showing received payments only'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/wallet/transactions',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/wallet/stats
 * Get wallet statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [walletBalance, recentInvoices] = await Promise.all([
      req.btcPayService.getWalletBalance().catch(() => null),
      req.btcPayService.getRecentInvoices(100).catch(() => [])
    ]);

    // Calculate stats from recent invoices
    const paidInvoices = recentInvoices.filter(invoice => 
      ['Settled', 'Processing'].includes(invoice.status)
    );
    
    const totalVolume = paidInvoices.reduce((sum, invoice) => 
      sum + (parseFloat(invoice.btcAmount) || 0), 0
    );

    const stats = {
      balance: walletBalance ? {
        total: walletBalance.balance,
        confirmed: walletBalance.confirmedBalance,
        currency: walletBalance.currency
      } : null,
      
      activity: {
        totalPayments: paidInvoices.length,
        totalVolume: `${totalVolume.toFixed(8)} BTC`,
        successRate: recentInvoices.length > 0 
          ? `${Math.round((paidInvoices.length / recentInvoices.length) * 100)}%`
          : '0%',
        recentPayments: Math.min(paidInvoices.length, 10)
      },

      period: {
        days: 30,
        note: 'Stats based on recent invoice data'
      }
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/wallet/stats',
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get wallet statistics',
      message: error.message
    });
  }
});

module.exports = router;