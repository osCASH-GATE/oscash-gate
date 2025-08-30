const http = require('http');
const config = require('./utils/config');

/**
 * Docker Health Check Script for osCASH.me Mobile Gateway
 */
const healthCheck = () => {
  const options = {
    hostname: 'localhost',
    port: config.PORT || 3000,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('Health check passed');
      process.exit(0);
    } else {
      console.error(`Health check failed with status code: ${res.statusCode}`);
      process.exit(1);
    }
  });

  req.on('error', (error) => {
    console.error(`Health check failed: ${error.message}`);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('Health check timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

healthCheck();