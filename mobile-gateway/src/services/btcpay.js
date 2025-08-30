const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * BTCPay Server Integration Service
 * 
 * Handles communication with BTCPay Server Greenfield API
 * Optimized for mobile gateway with simplified responses
 */
class BTCPayService {
  constructor(storeId, apiKey, serverUrl = null) {
    this.storeId = storeId;
    this.apiKey = apiKey;
    this.serverUrl = serverUrl || config.BTCPAY_URL;
    
    this.client = axios.create({
      baseURL: `${this.serverUrl}/api/v1`,
      timeout: 30000,
      headers: {
        'Authorization': `token ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('BTCPay API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          storeId: this.storeId
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('BTCPay API Response', {
          status: response.status,
          url: response.config.url,
          storeId: this.storeId
        });
        return response;
      },
      (error) => {
        logger.logError(error, {
          service: 'BTCPayService',
          url: error.config?.url,
          status: error.response?.status,
          storeId: this.storeId
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get BTCPay Server information
   */
  async getServerInfo() {
    try {
      const response = await this.client.get('/server/info');
      return {
        version: response.data.version,
        network: response.data.network,
        uptime: response.data.uptime,
        url: this.serverUrl,
        supportUrl: response.data.supportUrl
      };
    } catch (error) {
      logger.logError(error, { method: 'getServerInfo', storeId: this.storeId });
      throw new Error('Failed to get server information');
    }
  }

  /**
   * Get store information
   */
  async getStoreInfo() {
    try {
      const response = await this.client.get(`/stores/${this.storeId}`);
      const store = response.data;
      
      return {
        id: store.id,
        name: store.name,
        website: store.website,
        defaultCurrency: store.defaultCurrency,
        invoiceExpiration: store.invoiceExpiration,
        defaultPaymentMethod: store.defaultPaymentMethod,
        lightningEnabled: store.paymentMethods?.some(pm => 
          pm.paymentMethod?.includes('LightningNetwork')
        ) || false,
        onChainEnabled: store.paymentMethods?.some(pm => 
          pm.paymentMethod?.includes('BTC')
        ) || false
      };
    } catch (error) {
      logger.logError(error, { method: 'getStoreInfo', storeId: this.storeId });
      throw new Error('Failed to get store information');
    }
  }

  /**
   * Get wallet balance (if available)
   */
  async getWalletBalance() {
    try {
      // Try to get the first available wallet
      const walletsResponse = await this.client.get(`/stores/${this.storeId}/payment-methods/onchain`);
      
      if (!walletsResponse.data || walletsResponse.data.length === 0) {
        throw new Error('No wallets configured');
      }

      const firstWallet = walletsResponse.data[0];
      const derivationScheme = firstWallet.derivationScheme;
      
      const balanceResponse = await this.client.get(
        `/stores/${this.storeId}/payment-methods/onchain/${derivationScheme}/wallet`
      );
      
      return {
        balance: balanceResponse.data.balance,
        confirmedBalance: balanceResponse.data.confirmedBalance,
        unconfirmedBalance: balanceResponse.data.unconfirmedBalance,
        currency: 'BTC'
      };
    } catch (error) {
      logger.logError(error, { method: 'getWalletBalance', storeId: this.storeId });
      // Don't throw error - wallet might not be configured
      return null;
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(invoiceData) {
    try {
      const requestData = {
        amount: invoiceData.amount,
        currency: invoiceData.currency,
        orderId: invoiceData.orderId,
        description: invoiceData.description,
        expirationTime: invoiceData.expiry,
        metadata: {
          ...invoiceData.metadata,
          gateway: 'oscash-mobile-gateway',
          gatewayVersion: require('../../package.json').version
        },
        checkout: {
          redirectURL: invoiceData.redirectURL,
          closeURL: invoiceData.closeURL,
          defaultLanguage: 'en'
        }
      };

      const response = await this.client.post(`/stores/${this.storeId}/invoices`, requestData);
      const invoice = response.data;
      
      // Transform to mobile-friendly format
      return {
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        btcAmount: invoice.btcAmount,
        btcPrice: invoice.btcPrice,
        checkoutLink: invoice.checkoutLink,
        creationTime: invoice.createdTime,
        expirationTime: invoice.expirationTime,
        addresses: this.extractPaymentAddresses(invoice),
        btcUri: this.generateBitcoinUri(invoice)
      };
    } catch (error) {
      logger.logError(error, { 
        method: 'createInvoice', 
        storeId: this.storeId,
        invoiceData 
      });
      throw new Error('Failed to create invoice');
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId) {
    try {
      const response = await this.client.get(`/stores/${this.storeId}/invoices/${invoiceId}`);
      const invoice = response.data;
      
      return {
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        btcAmount: invoice.btcAmount,
        btcPrice: invoice.btcPrice,
        checkoutLink: invoice.checkoutLink,
        creationTime: invoice.createdTime,
        expirationTime: invoice.expirationTime,
        addresses: this.extractPaymentAddresses(invoice),
        confirmations: invoice.confirmations || 0,
        metadata: invoice.metadata
      };
    } catch (error) {
      logger.logError(error, { 
        method: 'getInvoice', 
        storeId: this.storeId,
        invoiceId 
      });
      throw new Error('Failed to get invoice');
    }
  }

  /**
   * Get recent invoices
   */
  async getRecentInvoices(limit = 10) {
    try {
      const response = await this.client.get(`/stores/${this.storeId}/invoices`, {
        params: {
          count: limit,
          orderBy: 'desc'
        }
      });
      
      return response.data.map(invoice => ({
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        btcAmount: invoice.btcAmount,
        description: invoice.metadata?.description || 'Payment',
        creationTime: invoice.createdTime,
        expirationTime: invoice.expirationTime,
        confirmations: invoice.confirmations || 0,
        metadata: invoice.metadata
      }));
    } catch (error) {
      logger.logError(error, { 
        method: 'getRecentInvoices', 
        storeId: this.storeId,
        limit 
      });
      throw new Error('Failed to get recent invoices');
    }
  }

  /**
   * Check invoice payment status
   */
  async checkPaymentStatus(invoiceId) {
    try {
      const invoice = await this.getInvoice(invoiceId);
      
      return {
        id: invoice.id,
        status: invoice.status,
        paid: ['Settled', 'Processing'].includes(invoice.status),
        expired: invoice.status === 'Expired',
        confirmations: invoice.confirmations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { 
        method: 'checkPaymentStatus', 
        storeId: this.storeId,
        invoiceId 
      });
      throw new Error('Failed to check payment status');
    }
  }

  /**
   * Extract payment addresses from invoice
   */
  extractPaymentAddresses(invoice) {
    const addresses = {};
    
    if (invoice.addresses) {
      // BTCPay returns addresses in different formats
      Object.keys(invoice.addresses).forEach(key => {
        if (key.includes('BTC') || key.includes('bitcoin')) {
          addresses.BTC = invoice.addresses[key];
        } else if (key.includes('LightningNetwork') || key.includes('lightning')) {
          addresses.LightningNetwork = invoice.addresses[key];
        }
      });
    }
    
    return addresses;
  }

  /**
   * Generate Bitcoin URI for invoice
   */
  generateBitcoinUri(invoice) {
    const addresses = this.extractPaymentAddresses(invoice);
    
    if (addresses.BTC && invoice.btcAmount) {
      let uri = `bitcoin:${addresses.BTC}?amount=${invoice.btcAmount}`;
      
      if (invoice.description) {
        uri += `&message=${encodeURIComponent(invoice.description)}`;
      }
      
      return uri;
    }
    
    return null;
  }

  /**
   * Test connection to BTCPay Server
   */
  async testConnection() {
    try {
      const [serverInfo, storeInfo] = await Promise.all([
        this.getServerInfo(),
        this.getStoreInfo()
      ]);
      
      return {
        connected: true,
        server: serverInfo,
        store: storeInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error, { 
        method: 'testConnection', 
        storeId: this.storeId 
      });
      
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = BTCPayService;