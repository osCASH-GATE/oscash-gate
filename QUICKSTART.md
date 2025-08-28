# osCASH.me GATE - Quick Start Guide

**Get your self-hosted payment gateway running in 5 minutes!** ⚡

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 4GB+ RAM, 20GB+ SSD
- Open port 23000

### 1. Clone & Configure

```bash
# Clone osCASH.me GATE
git clone https://github.com/osCASHme/oscash-gate.git
cd oscash-gate

# Copy environment template
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 2. Generate Secrets

```bash
# Generate secure secrets
echo "BTCPAY_SIGNINGSEED=$(openssl rand -hex 32)" >> .env
echo "BTCPAY_COOKIESECRET=$(openssl rand -hex 32)" >> .env
```

### 3. Start GATE

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose logs oscash-gate
```

### 4. Access GATE

Open browser: **http://localhost:23000**

Default admin setup will guide you through first-time configuration.

## 🔧 Configuration Options

### Basic Setup (.env)

```bash
# Your domain
OSCASH_GATE_HOST=gate.example.com
OSCASH_GATE_PORT=23000

# Network (mainnet/testnet)
BTCPAY_NETWORK=mainnet

# Database password
POSTGRES_PASSWORD=your-secure-password
```

### Advanced Features

```bash
# Enable Lightning Network
BTCPAY_ENABLE_LIGHTNING=true

# Enable Tor for privacy
BTCPAY_TOR_ENABLED=true

# Custom branding
BTCPAY_BRAND_TITLE="My Payment Gateway"
```

## 📱 Mobile App Integration

### Connect osCASH.me App

1. Open osCASH.me App → Settings → Payments
2. Select "Custom Gateway"
3. Enter your GATE URL: `https://gate.example.com`
4. Generate API key in GATE admin panel
5. Add API key in app

### API Endpoints

```bash
# Create invoice
POST /api/v1/stores/{storeId}/invoices
Authorization: token YOUR_API_TOKEN

# Webhook URL (for app notifications)
POST /webhooks/oscash-app
```

## 🔐 Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Enable SSL/TLS with Let's Encrypt
- [ ] Configure firewall (only port 23000 + 22 for SSH)
- [ ] Regular backups to external storage
- [ ] Monitor logs for suspicious activity

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs

# Reset volumes
docker-compose down -v
docker-compose up -d
```

### Database Connection Error
```bash
# Check PostgreSQL
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port Already in Use
```bash
# Check what's using port 23000
sudo lsof -i :23000

# Change port in .env
OSCASH_GATE_PORT=23001
```

## 📊 Production Deployment

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name gate.example.com;
    
    location / {
        proxy_pass http://localhost:23000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d gate.example.com
```

### System Service (Systemd)

```bash
# Create service file
sudo nano /etc/systemd/system/oscash-gate.service

# Enable auto-start
sudo systemctl enable oscash-gate
sudo systemctl start oscash-gate
```

## 🔄 Updates

```bash
# Backup first
docker-compose exec postgres pg_dumpall > backup.sql

# Update
git pull origin main
docker-compose pull
docker-compose up -d --build

# Verify
docker-compose logs oscash-gate
```

## 📈 Monitoring

### Health Check

```bash
# API health endpoint
curl http://localhost:23000/api/v1/health

# Docker status
docker-compose ps
```

### Log Monitoring

```bash
# Live logs
docker-compose logs -f oscash-gate

# Error logs only
docker-compose logs oscash-gate | grep ERROR
```

## ❓ Need Help?

- **Documentation**: [Wiki](https://github.com/osCASHme/oscash-gate/wiki)
- **Issues**: [GitHub Issues](https://github.com/osCASHme/oscash-gate/issues)
- **Discussions**: [Community Forum](https://github.com/osCASHme/oscash-gate/discussions)
- **Security**: security@osCASH.me

---

**Privacy First. Swiss Clockwork Reliability.** 🔒⏰