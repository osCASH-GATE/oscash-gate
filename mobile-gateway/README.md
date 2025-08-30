# osCASH.me Mobile API Gateway

A mobile-optimized API gateway for the osCASH.me ecosystem, providing simplified endpoints and real-time WebSocket updates for mobile applications connecting to BTCPay Server.

## Features

- **Mobile-Optimized API**: Simplified endpoints designed for mobile battery life and network efficiency
- **Real-Time Updates**: WebSocket connections for instant payment status notifications
- **Security**: JWT authentication, rate limiting, and secure BTCPay Server integration
- **Easy Integration**: Clean REST API with predictable responses
- **Docker Ready**: Complete containerization with Docker Compose support

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/osCASH/oscash-gate.git
cd oscash-gate/mobile-gateway
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure your BTCPay Server credentials in `.env`:
```env
BTCPAY_URL=https://your-btcpay-server.com
BTCPAY_API_KEY=your_api_key_here
BTCPAY_STORE_ID=your_store_id_here
MOBILE_JWT_SECRET=your_secure_jwt_secret_here
```

4. Start the services:
```bash
docker-compose up -d
```

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (see `.env.example`)

3. Start the server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Authenticate with BTCPay credentials
- `POST /api/v1/auth/test-connection` - Test BTCPay Server connection

### Mobile Optimized
- `GET /api/v1/mobile/status` - Get overall app status and configuration
- `POST /api/v1/mobile/quick-payment` - Create quick payment QR codes
- `GET /api/v1/mobile/recent-activity` - Get recent payment activity
- `POST /api/v1/mobile/scan-payment` - Process scanned QR codes

### Payments
- `GET /api/v1/payments` - List payments with filtering
- `POST /api/v1/payments` - Create new payment
- `GET /api/v1/payments/:id` - Get payment details
- `GET /api/v1/payments/:id/status` - Get payment status (lightweight)

### Wallet
- `GET /api/v1/wallet/balance` - Get wallet balance
- `GET /api/v1/wallet/info` - Get wallet configuration
- `GET /api/v1/wallet/addresses` - Get receive addresses
- `POST /api/v1/wallet/validate-address` - Validate Bitcoin addresses
- `GET /api/v1/wallet/transactions` - Get transaction history
- `GET /api/v1/wallet/stats` - Get wallet statistics

### System
- `GET /health` - Health check endpoint

## WebSocket API

Connect to `ws://your-gateway:3000/ws` for real-time updates.

### Message Types

**Authentication:**
```json
{
  "type": "authenticate",
  "payload": {
    "token": "your-jwt-token"
  }
}
```

**Subscribe to Payment Updates:**
```json
{
  "type": "subscribe_payment",
  "payload": {
    "paymentId": "payment_id_here"
  }
}
```

**Heartbeat:**
```json
{
  "type": "heartbeat"
}
```

## Mobile App Integration

### Authentication Flow

1. **Get JWT Token:**
```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storeId: 'your-store-id',
    apiKey: 'your-api-key',
    serverUrl: 'https://your-btcpay.com' // optional
  })
});

const { data } = await response.json();
const token = data.auth.token;
```

2. **Use Token for API Calls:**
```javascript
const response = await fetch('/api/v1/mobile/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### WebSocket Integration

```javascript
const ws = new WebSocket('ws://your-gateway:3000/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'authenticate',
    payload: { token: yourJWTToken }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'payment_update') {
    console.log('Payment updated:', message.paymentId, message.status);
  }
};

// Subscribe to payment updates
ws.send(JSON.stringify({
  type: 'subscribe_payment',
  payload: { paymentId: 'your-payment-id' }
}));
```

## Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `BTCPAY_URL` | BTCPay Server URL | `http://localhost:23000` |
| `BTCPAY_API_KEY` | BTCPay Server API Key | Required |
| `BTCPAY_STORE_ID` | BTCPay Server Store ID | Required |
| `MOBILE_JWT_SECRET` | JWT signing secret | Required in production |
| `PORT` | Server port | `3000` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per IP | `100` |
| `WEBSOCKET_MAX_CONNECTIONS` | Max WebSocket connections | `1000` |

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Configurable request rate limits
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Request validation with express-validator
- **Error Handling**: Centralized error handling with logging
- **Connection Validation**: BTCPay Server connection testing

## Logging

Structured logging with different levels:
- **Development**: Console output with colors
- **Production**: JSON logs with file output

Log levels: `error`, `warn`, `info`, `debug`

## Health Monitoring

- Health check endpoint at `/health`
- Docker health checks configured
- WebSocket connection monitoring
- BTCPay Server connection validation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Docker Deployment

The included `docker-compose.yml` provides a complete osCASH.me infrastructure:

- **Mobile Gateway**: This API service
- **BTCPay Server**: Payment processing server
- **PostgreSQL**: Database for BTCPay
- **NBXplorer**: Bitcoin blockchain explorer
- **Traefik**: Reverse proxy with SSL

## Architecture

```
Mobile App <--> Mobile Gateway <--> BTCPay Server <--> Bitcoin Network
    ↑                  ↑
    └── WebSocket -----┘
```

The Mobile Gateway acts as an optimization layer, providing:
- Simplified API responses
- Mobile-optimized data formats
- Real-time WebSocket updates
- Authentication management
- Request caching and rate limiting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the osCASH.me ecosystem and follows the same open-source licensing.

## Support

- Documentation: https://docs.osCASH.me/mobile-gateway
- Issues: https://github.com/osCASH/oscash-gate/issues
- Support: https://osCASH.me/support