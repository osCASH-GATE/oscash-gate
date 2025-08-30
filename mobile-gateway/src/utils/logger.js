const winston = require('winston');
const config = require('./config');

/**
 * osCASH.me Mobile Gateway Logger
 * 
 * Structured logging with different levels and outputs
 */
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        service: 'oscash-mobile-gateway',
        message,
        ...meta
      });
    })
  ),
  defaultMeta: { 
    service: 'oscash-mobile-gateway',
    version: require('../../package.json').version
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: config.IS_DEVELOPMENT ? 
        winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaString}`;
          })
        ) : 
        winston.format.json()
    })
  ]
});

// Add file transport in production
if (config.IS_PRODUCTION) {
  logger.add(new winston.transports.File({ 
    filename: 'error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: config.LOG_FILE 
  }));
}

// Add request logging helper
logger.logRequest = (req, res, responseTime) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentLength: res.get('Content-Length') || 0
  });
};

// Add payment logging helper
logger.logPayment = (action, paymentId, details = {}) => {
  logger.info(`Payment ${action}`, {
    paymentId,
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Add error logging helper
logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

// Add WebSocket logging helper
logger.logWebSocket = (event, connectionId, data = {}) => {
  logger.info(`WebSocket ${event}`, {
    event,
    connectionId,
    timestamp: new Date().toISOString(),
    ...data
  });
};

module.exports = logger;