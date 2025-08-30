const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * QR Code Generation and Parsing Service
 * 
 * Handles QR code generation for payments and parsing of scanned codes
 * Optimized for mobile use cases
 */
class QRService {
  
  /**
   * Generate QR code for payment
   */
  static async generatePaymentQR(paymentData, options = {}) {
    try {
      const qrOptions = {
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        width: options.size || 256,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };

      // Generate data URL for mobile display
      const dataURL = await QRCode.toDataURL(paymentData, qrOptions);
      
      // Generate text version for accessibility
      const textQR = await QRCode.toString(paymentData, {
        type: 'terminal',
        small: true
      });

      logger.info('QR code generated', {
        dataLength: paymentData.length,
        size: qrOptions.width
      });

      return {
        dataURL: dataURL,
        text: textQR,
        data: paymentData,
        size: qrOptions.width,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.logError(error, { 
        method: 'generatePaymentQR',
        paymentDataLength: paymentData?.length 
      });
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for Bitcoin URI
   */
  static async generateBitcoinQR(address, amount, message, options = {}) {
    try {
      let uri = `bitcoin:${address}`;
      const params = [];

      if (amount) {
        params.push(`amount=${amount}`);
      }

      if (message) {
        params.push(`message=${encodeURIComponent(message)}`);
      }

      if (params.length > 0) {
        uri += '?' + params.join('&');
      }

      return await this.generatePaymentQR(uri, options);
    } catch (error) {
      logger.logError(error, { 
        method: 'generateBitcoinQR',
        address: address?.substring(0, 10) + '...' 
      });
      throw new Error('Failed to generate Bitcoin QR code');
    }
  }

  /**
   * Generate QR code for Lightning invoice
   */
  static async generateLightningQR(invoice, options = {}) {
    try {
      // Lightning invoices are already in the correct format
      const upperInvoice = invoice.toUpperCase();
      
      return await this.generatePaymentQR(upperInvoice, {
        ...options,
        // Lightning invoices can be long, use higher error correction
        errorCorrectionLevel: 'H'
      });
    } catch (error) {
      logger.logError(error, { 
        method: 'generateLightningQR',
        invoicePrefix: invoice?.substring(0, 10) + '...'
      });
      throw new Error('Failed to generate Lightning QR code');
    }
  }

  /**
   * Parse scanned QR code data
   */
  static parsePaymentQR(qrData) {
    try {
      if (!qrData || typeof qrData !== 'string') {
        return {
          isValid: false,
          error: 'Invalid QR data',
          type: 'unknown'
        };
      }

      const trimmedData = qrData.trim();
      
      // Bitcoin URI (bitcoin:address?params)
      if (trimmedData.startsWith('bitcoin:')) {
        return this.parseBitcoinURI(trimmedData);
      }
      
      // Lightning invoice (lnbc, lntb, lnbcrt)
      if (trimmedData.toLowerCase().match(/^ln(bc|tb|bcrt)/)) {
        return this.parseLightningInvoice(trimmedData);
      }
      
      // Raw Bitcoin address
      if (this.isBitcoinAddress(trimmedData)) {
        return {
          isValid: true,
          type: 'bitcoin_address',
          address: trimmedData,
          amount: null,
          currency: 'BTC',
          message: null,
          isLightning: false
        };
      }
      
      // BTCPay Server checkout link
      if (trimmedData.includes('/i/') || trimmedData.includes('/invoice/')) {
        return {
          isValid: true,
          type: 'btcpay_invoice',
          checkoutLink: trimmedData,
          isLightning: false
        };
      }
      
      // Generic URL (might be a payment link)
      if (trimmedData.startsWith('http')) {
        return {
          isValid: true,
          type: 'payment_url',
          url: trimmedData,
          message: 'Payment URL detected'
        };
      }
      
      // Unknown format
      return {
        isValid: false,
        error: 'Unsupported QR code format',
        type: 'unknown',
        data: trimmedData.substring(0, 50) + '...'
      };

    } catch (error) {
      logger.logError(error, { 
        method: 'parsePaymentQR',
        dataLength: qrData?.length 
      });
      
      return {
        isValid: false,
        error: 'Failed to parse QR code',
        type: 'error'
      };
    }
  }

  /**
   * Parse Bitcoin URI
   */
  static parseBitcoinURI(uri) {
    try {
      const url = new URL(uri);
      const address = url.pathname;
      
      if (!this.isBitcoinAddress(address)) {
        return {
          isValid: false,
          error: 'Invalid Bitcoin address in URI',
          type: 'bitcoin_uri'
        };
      }

      const amount = url.searchParams.get('amount');
      const message = url.searchParams.get('message') || url.searchParams.get('label');

      return {
        isValid: true,
        type: 'bitcoin_uri',
        address: address,
        amount: amount ? parseFloat(amount) : null,
        currency: 'BTC',
        message: message,
        isLightning: false
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid Bitcoin URI format',
        type: 'bitcoin_uri'
      };
    }
  }

  /**
   * Parse Lightning invoice
   */
  static parseLightningInvoice(invoice) {
    try {
      const upperInvoice = invoice.toUpperCase();
      
      // Basic Lightning invoice validation
      if (!upperInvoice.match(/^LN(BC|TB|BCRT)[0-9]+[MUNP]?/)) {
        return {
          isValid: false,
          error: 'Invalid Lightning invoice format',
          type: 'lightning_invoice'
        };
      }

      // Extract network from prefix
      let network = 'mainnet';
      if (upperInvoice.startsWith('LNTB')) {
        network = 'testnet';
      } else if (upperInvoice.startsWith('LNBCRT')) {
        network = 'regtest';
      }

      // Try to extract amount (basic parsing)
      const amountMatch = upperInvoice.match(/^LN(BC|TB|BCRT)(\d+)([MUNP]?)/);
      let amount = null;
      
      if (amountMatch && amountMatch[2]) {
        const value = parseInt(amountMatch[2]);
        const unit = amountMatch[3] || '';
        
        // Convert to BTC based on unit
        switch (unit) {
          case 'M': // milli-bitcoin (0.001 BTC)
            amount = value * 0.001;
            break;
          case 'U': // micro-bitcoin (0.000001 BTC)
            amount = value * 0.000001;
            break;
          case 'N': // nano-bitcoin (0.000000001 BTC)
            amount = value * 0.000000001;
            break;
          case 'P': // pico-bitcoin (0.000000000001 BTC)
            amount = value * 0.000000000001;
            break;
          default:
            // If no unit, assume satoshis
            amount = value * 0.00000001;
        }
      }

      return {
        isValid: true,
        type: 'lightning_invoice',
        invoice: invoice,
        network: network,
        amount: amount,
        currency: 'BTC',
        isLightning: true
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to parse Lightning invoice',
        type: 'lightning_invoice'
      };
    }
  }

  /**
   * Validate Bitcoin address format
   */
  static isBitcoinAddress(address) {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Basic Bitcoin address validation
    // Legacy addresses (1...)
    if (address.match(/^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
      return true;
    }
    
    // SegWit addresses (3...)
    if (address.match(/^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
      return true;
    }
    
    // Bech32 addresses (bc1...)
    if (address.match(/^bc1[a-z0-9]{39,59}$/)) {
      return true;
    }
    
    // Testnet addresses
    if (address.match(/^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
      return true;
    }
    
    // Testnet bech32 (tb1...)
    if (address.match(/^tb1[a-z0-9]{39,59}$/)) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate QR code for osCASH.me payment link
   */
  static async generatePaymentLinkQR(paymentId, gatewayUrl, options = {}) {
    try {
      const paymentLink = `${gatewayUrl}/pay/${paymentId}`;
      
      return await this.generatePaymentQR(paymentLink, {
        ...options,
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      logger.logError(error, { 
        method: 'generatePaymentLinkQR',
        paymentId 
      });
      throw new Error('Failed to generate payment link QR code');
    }
  }

  /**
   * Create QR code with osCASH.me branding
   */
  static async generateBrandedQR(data, options = {}) {
    try {
      const brandedOptions = {
        ...options,
        color: {
          dark: options.darkColor || '#2563EB', // osCASH.me blue
          light: options.lightColor || '#FFFFFF'
        },
        margin: 2,
        width: options.size || 300
      };

      return await this.generatePaymentQR(data, brandedOptions);
    } catch (error) {
      logger.logError(error, { method: 'generateBrandedQR' });
      throw new Error('Failed to generate branded QR code');
    }
  }
}

module.exports = QRService;