const dotenv = require('dotenv');
dotenv.config();

/**
 * osCASH.me Mobile Gateway Configuration
 * 
 * Environment variables and configuration management
 */
const config = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // BTCPay Server Configuration
  BTCPAY_URL: process.env.BTCPAY_URL || 'http://localhost:23000',
  BTCPAY_API_KEY: process.env.BTCPAY_API_KEY || '',
  BTCPAY_STORE_ID: process.env.BTCPAY_STORE_ID || '',
  
  // Mobile API Configuration
  MOBILE_JWT_SECRET: process.env.MOBILE_JWT_SECRET || 'osCASH-mobile-secret-change-in-production',
  MOBILE_JWT_EXPIRES_IN: process.env.MOBILE_JWT_EXPIRES_IN || '24h',
  
  // Security Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'https://gate.osCASH.me'],
  
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // WebSocket Configuration
  WEBSOCKET_HEARTBEAT_INTERVAL: parseInt(process.env.WEBSOCKET_HEARTBEAT_INTERVAL) || 30000,
  WEBSOCKET_MAX_CONNECTIONS: parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS) || 1000,
  
  // Payment Configuration
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'BTC',
  SUPPORTED_CURRENCIES: process.env.SUPPORTED_CURRENCIES ? 
    process.env.SUPPORTED_CURRENCIES.split(',') : 
    ['BTC', 'SATS', 'USD'],
  
  // Invoice Configuration
  DEFAULT_INVOICE_EXPIRY: parseInt(process.env.DEFAULT_INVOICE_EXPIRY) || 3600, // 1 hour in seconds
  MIN_INVOICE_AMOUNT_SATS: parseInt(process.env.MIN_INVOICE_AMOUNT_SATS) || 1000,
  MAX_INVOICE_AMOUNT_SATS: parseInt(process.env.MAX_INVOICE_AMOUNT_SATS) || 100000000, // 1 BTC
  
  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'mobile-gateway.log',
  
  // Cache Configuration
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
  
  // osCASH.me Specific
  OSCASH_BRAND_NAME: process.env.OSCASH_BRAND_NAME || 'osCASH.me',
  OSCASH_SUPPORT_URL: process.env.OSCASH_SUPPORT_URL || 'https://osCASH.me/support',
  
  // Development flags
  ENABLE_API_DOCS: process.env.ENABLE_API_DOCS !== 'false',
  ENABLE_CORS_DEBUG: process.env.ENABLE_CORS_DEBUG === 'true',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
};

// Validation
const requiredEnvVars = ['BTCPAY_URL', 'BTCPAY_API_KEY'];

if (config.NODE_ENV === 'production') {
  requiredEnvVars.push('MOBILE_JWT_SECRET');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('Running in development mode with default values');
  }
}

// Derived configurations
config.IS_PRODUCTION = config.NODE_ENV === 'production';
config.IS_DEVELOPMENT = config.NODE_ENV === 'development';

module.exports = config;