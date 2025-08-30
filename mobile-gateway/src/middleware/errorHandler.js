const logger = require('../utils/logger');

/**
 * osCASH.me Mobile Gateway Error Handler
 * 
 * Centralized error handling middleware with mobile-optimized responses
 */
const errorHandler = (error, req, res, next) => {
  // Default error response
  let status = 500;
  let response = {
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    response.error = 'Validation error';
    response.message = error.message;
    response.details = error.details || null;
  } else if (error.name === 'UnauthorizedError' || error.status === 401) {
    status = 401;
    response.error = 'Unauthorized';
    response.message = 'Authentication required';
  } else if (error.name === 'ForbiddenError' || error.status === 403) {
    status = 403;
    response.error = 'Forbidden';
    response.message = 'Access denied';
  } else if (error.name === 'NotFoundError' || error.status === 404) {
    status = 404;
    response.error = 'Not found';
    response.message = 'Resource not found';
  } else if (error.status) {
    // Use error status if provided
    status = error.status;
    response.message = error.message || response.message;
  }

  // Log error details
  logger.logError(error, {
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    status: status,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Send response
  res.status(status).json(response);
};

module.exports = errorHandler;