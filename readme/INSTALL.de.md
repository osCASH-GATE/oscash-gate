# osCASH.me GATE - Installationsanleitung

## 📋 Inhaltsverzeichnis

- [Systemanforderungen](#systemanforderungen)
- [Docker Installation](#docker-installation)
- [Manuelle Installation](#manuelle-installation)
- [SSL-Zertifikate](#ssl-zertifikate)
- [Erste Konfiguration](#erste-konfiguration)
- [Mobile Gateway Setup](#mobile-gateway-setup)
- [Troubleshooting](#troubleshooting)

## 🖥️ Systemanforderungen

### Mindestanforderungen

- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: 2 GB (4 GB empfohlen)
- **CPU**: 2 Cores
- **Speicher**: 20 GB SSD
- **Netzwerk**: Öffentliche IP oder Domain

### Empfohlene Anforderungen

- **OS**: Ubuntu 22.04 LTS
- **RAM**: 8 GB
- **CPU**: 4 Cores
- **Speicher**: 100 GB SSD
- **Netzwerk**: Domain mit SSL-Zertifikat

## 🐳 Docker Installation

### 1. Docker installieren

```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installieren
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Benutzer zur Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER
```

### 2. osCASH.me GATE herunterladen

```bash
# Repository klonen
git clone https://github.com/osCASHme/oscash-gate.git
cd oscash-gate

# Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env
```

### 3. Umgebungsvariablen konfigurieren

Bearbeite die `.env` Datei:

```env
# Netzwerk-Konfiguration
OSCASH_GATE_HOST=pay.yourdomain.com
OSCASH_GATE_PORT=443
OSCASH_GATE_PROTOCOL=https

# Datenbank
POSTGRES_USER=oscash
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=oscashgate

# Bitcoin Node (optional)
BITCOIN_RPC_HOST=localhost
BITCOIN_RPC_PORT=8332
BITCOIN_RPC_USER=bitcoin
BITCOIN_RPC_PASSWORD=bitcoin_password

# Lightning Node (optional)
LIGHTNING_TYPE=lnd
LIGHTNING_CONNECTION_STRING=lnd://localhost:10009

# Mobile Gateway
MOBILE_GATEWAY_PORT=3000
MOBILE_GATEWAY_API_KEY=your-api-key-here
```

### 4. Container starten

```bash
# Alle Services starten
docker-compose up -d

# Logs überprüfen
docker-compose logs -f

# Status prüfen
docker-compose ps
```

## 🔧 Manuelle Installation

### 1. Abhängigkeiten installieren

```bash
# .NET SDK installieren
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0

# PostgreSQL installieren
sudo apt-get install -y postgresql postgresql-contrib

# Node.js für Mobile Gateway
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Datenbank einrichten

```bash
# PostgreSQL konfigurieren
sudo -u postgres psql

CREATE DATABASE oscashgate;
CREATE USER oscash WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE oscashgate TO oscash;
\q
```

### 3. osCASH.me GATE kompilieren

```bash
# Repository klonen
git clone https://github.com/osCASHme/oscash-gate.git
cd oscash-gate

# Kompilieren
dotnet build
dotnet publish -c Release

# Ausführen
cd BTCPayServer
dotnet run --urls=https://localhost:5001
```

## 🔐 SSL-Zertifikate

### Let's Encrypt mit Certbot

```bash
# Certbot installieren
sudo apt-get install certbot

# Zertifikat erstellen
sudo certbot certonly --standalone -d pay.yourdomain.com

# Auto-Renewal einrichten
sudo crontab -e
# Füge diese Zeile hinzu:
0 0 * * * /usr/bin/certbot renew --quiet
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name pay.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/pay.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pay.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## ⚙️ Erste Konfiguration

### 1. Admin-Account erstellen

1. Öffne `https://pay.yourdomain.com`
2. Klicke auf "Register"
3. Erstelle den ersten Admin-Account
4. Bestätige die E-Mail-Adresse

### 2. Store einrichten

1. Gehe zu "Stores" > "Create Store"
2. Gib Store-Name ein
3. Wähle Währung (EUR/USD/BTC)
4. Speichern

### 3. Wallet konfigurieren

1. Gehe zu Store-Einstellungen
2. "Setup Wallet" wählen
3. Seed-Phrase generieren oder importieren
4. Derivation Path bestätigen

## 📱 Mobile Gateway Setup

### Installation

```bash
cd mobile-gateway

# Abhängigkeiten installieren
npm install

# Konfiguration
cp .env.example .env
nano .env
```

### Konfiguration

```env
# Mobile Gateway Konfiguration
PORT=3000
API_KEY=your-secure-api-key
OSCASH_GATE_URL=http://localhost:5001
DATABASE_URL=postgresql://oscash:password@localhost/oscashgate

# CORS Settings
CORS_ORIGIN=https://app.oscash.me
```

### Starten

```bash
# Entwicklungsmodus
npm run dev

# Produktionsmodus
npm start

# Mit PM2 (empfohlen)
pm2 start npm --name "oscash-mobile-gateway" -- start
pm2 save
pm2 startup
```

## 🐛 Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker-compose logs oscash-gate

# Container neu starten
docker-compose restart

# Clean restart
docker-compose down
docker-compose up -d
```

### Datenbank-Verbindungsfehler

```bash
# PostgreSQL Status prüfen
sudo systemctl status postgresql

# Verbindung testen
psql -h localhost -U oscash -d oscashgate
```

### SSL-Zertifikat-Probleme

```bash
# Zertifikat prüfen
sudo certbot certificates

# Manuell erneuern
sudo certbot renew --force-renewal
```

### Port-Konflikte

```bash
# Verwendete Ports prüfen
sudo netstat -tulpn | grep LISTEN

# Ports in docker-compose.yml anpassen
nano docker-compose.yml
```

## 📞 Support

Bei Problemen:

1. [GitHub Issues](https://github.com/osCASHme/oscash-gate/issues)
2. [Community Forum](https://recode.at/forum)
3. [Dokumentation](https://docs.oscash.me)

---

<div align="center">
  <strong>Viel Erfolg mit deiner osCASH.me GATE Installation!</strong>
</div>