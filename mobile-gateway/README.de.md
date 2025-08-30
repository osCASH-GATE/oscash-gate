# osCASH.me Mobile Gateway

## 🎯 Überblick

Das Mobile Gateway ist die Brücke zwischen der osCASH.me Android App und dem osCASH.me GATE Payment Server. Es bietet eine vereinfachte REST API speziell für mobile Anwendungen.

## 🚀 Features

- **Optimiert für Mobile**: Reduzierte Payload-Größen und optimierte Endpoints
- **JWT Authentication**: Sichere Token-basierte Authentifizierung
- **WebSocket Support**: Echtzeit-Updates für Zahlungsstatus
- **Rate Limiting**: Schutz vor Missbrauch
- **CORS Support**: Sichere Cross-Origin Requests
- **Health Checks**: Monitoring und Status-Endpoints

## 📦 Installation

### Voraussetzungen

- Node.js 18+ 
- npm oder yarn
- PostgreSQL (optional, für Persistenz)
- Redis (optional, für Caching)

### Setup

```bash
# Repository klonen
git clone https://github.com/osCASHme/oscash-gate.git
cd oscash-gate/mobile-gateway

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env

# Entwicklungsserver starten
npm run dev

# Produktionsserver starten
npm start
```

## ⚙️ Konfiguration

### Umgebungsvariablen (.env)

```env
# Server-Konfiguration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# API-Sicherheit
API_KEY=your-secure-api-key-here
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRY=24h

# osCASH.me GATE Backend
OSCASH_GATE_URL=http://localhost:5001
OSCASH_GATE_API_KEY=gate-api-key

# Datenbank (optional)
DATABASE_URL=postgresql://user:pass@localhost/mobile_gateway
REDIS_URL=redis://localhost:6379

# CORS-Einstellungen
CORS_ORIGIN=https://app.oscash.me,https://demo.oscash.me
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE=mobile-gateway.log
```

## 📡 API Endpoints

### Authentifizierung

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "apiKey": "demo-api-key-for-testing"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h"
}
```

#### Token erneuern
```http
POST /api/v1/auth/refresh
Authorization: Bearer <token>

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h"
}
```

### Server-Status

#### Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-08-30T12:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### Verbindungstest
```http
GET /api/v1/mobile/status
Authorization: Bearer <token>

Response:
{
  "connected": true,
  "serverVersion": "1.0.0",
  "features": ["lightning", "onchain", "fiat"],
  "currencies": ["BTC", "EUR", "USD"]
}
```

### Zahlungen

#### Rechnung erstellen
```http
POST /api/v1/mobile/invoice
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 10.00,
  "currency": "EUR",
  "description": "Kaffee-Zahlung",
  "metadata": {
    "orderId": "12345",
    "userId": "user-123"
  }
}

Response:
{
  "invoiceId": "inv_xyz123",
  "amount": 10.00,
  "currency": "EUR",
  "btcAmount": "0.00024851",
  "paymentUrl": "bitcoin:bc1qxy...",
  "lightningInvoice": "lnbc10u1p3...",
  "expiresAt": "2025-08-30T13:00:00Z",
  "status": "pending"
}
```

#### Rechnungsstatus
```http
GET /api/v1/mobile/invoice/{invoiceId}
Authorization: Bearer <token>

Response:
{
  "invoiceId": "inv_xyz123",
  "status": "paid",
  "paidAt": "2025-08-30T12:30:00Z",
  "amount": 10.00,
  "currency": "EUR",
  "btcAmount": "0.00024851",
  "txId": "abc123..."
}
```

#### Kontostand
```http
GET /api/v1/mobile/balance
Authorization: Bearer <token>

Response:
{
  "balances": {
    "BTC": {
      "available": "0.00145000",
      "pending": "0.00010000",
      "total": "0.00155000"
    },
    "EUR": {
      "equivalent": "42.50"
    }
  },
  "lastUpdated": "2025-08-30T12:00:00Z"
}
```

### Transaktionshistorie

#### Transaktionen abrufen
```http
GET /api/v1/mobile/transactions?limit=10&offset=0
Authorization: Bearer <token>

Response:
{
  "transactions": [
    {
      "id": "tx_123",
      "type": "incoming",
      "amount": "0.00024851",
      "currency": "BTC",
      "status": "confirmed",
      "confirmations": 6,
      "timestamp": "2025-08-30T11:00:00Z",
      "description": "Zahlung erhalten"
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

## 🔌 WebSocket Events

### Verbindung
```javascript
const ws = new WebSocket('wss://gateway.oscash.me/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'Bearer <token>'
  }));
});
```

### Events

#### Zahlungsupdate
```javascript
{
  "type": "payment.updated",
  "data": {
    "invoiceId": "inv_xyz123",
    "status": "paid",
    "amount": "0.00024851",
    "confirmations": 1
  }
}
```

#### Neue Transaktion
```javascript
{
  "type": "transaction.new",
  "data": {
    "id": "tx_456",
    "type": "incoming",
    "amount": "0.00100000",
    "status": "pending"
  }
}
```

## 🛡️ Sicherheit

### Rate Limiting

Das Gateway implementiert Rate Limiting pro IP und API-Key:
- 100 Requests pro 15 Minuten (Standard)
- 1000 Requests pro 15 Minuten (authentifiziert)

### CORS

Cross-Origin Requests sind nur von konfigurierten Domains erlaubt:
- `https://app.oscash.me`
- `https://demo.oscash.me`

### Headers

Erforderliche Sicherheits-Header:
```http
X-Request-ID: unique-request-id
X-API-Version: v1
User-Agent: osCASH.me/1.0.0
```

## 🐛 Debugging

### Logs

```bash
# Logs anzeigen
tail -f mobile-gateway.log

# Error logs
tail -f error.log

# Docker logs
docker logs oscash-mobile-gateway -f
```

### Test-Modus

```bash
# Mit Debug-Output starten
DEBUG=* npm run dev

# Spezifische Module debuggen
DEBUG=express:* npm start
```

## 📊 Monitoring

### Health-Check Endpoint

```bash
# Einfacher Health-Check
curl http://localhost:3000/health

# Detaillierter Status
curl http://localhost:3000/api/v1/status \
  -H "Authorization: Bearer <token>"
```

### Metriken

```bash
# Prometheus-Metriken
curl http://localhost:3000/metrics
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2

```bash
# Mit PM2 starten
pm2 start ecosystem.config.js

# Logs anzeigen
pm2 logs oscash-mobile-gateway

# Monitoring
pm2 monit
```

### Systemd

```ini
[Unit]
Description=osCASH.me Mobile Gateway
After=network.target

[Service]
Type=simple
User=oscash
WorkingDirectory=/opt/oscash-gate/mobile-gateway
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 📚 Beispiele

### cURL

```bash
# Login
curl -X POST https://demo-pay.oscash.org:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "demo-api-key-for-testing"}'

# Status prüfen
curl https://demo-pay.oscash.org:3000/api/v1/mobile/status \
  -H "Authorization: Bearer <token>"
```

### JavaScript/TypeScript

```javascript
const API_URL = 'https://demo-pay.oscash.org:3000';

async function login(apiKey) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  });
  
  const data = await response.json();
  return data.token;
}

async function createInvoice(token, amount, currency) {
  const response = await fetch(`${API_URL}/api/v1/mobile/invoice`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, currency }),
  });
  
  return response.json();
}
```

## 🤝 Support

- [GitHub Issues](https://github.com/osCASHme/oscash-gate/issues)
- [API Dokumentation](https://docs.oscash.me/api)
- [Community Forum](https://recode.at)

---

<div align="center">
  <strong>Mobile Gateway für osCASH.me</strong>
  <br>
  <sub>Sichere und schnelle Zahlungen für mobile Apps</sub>
</div>