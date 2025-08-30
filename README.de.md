# osCASH.me GATE

![osCASH.me GATE](BTCPayServer/wwwroot/img/btc_pay_BG_twitter.png)

<h3 align="center">
  Akzeptiere Bitcoin & Kryptowährungszahlungen ₿💰
</h3>
<p align="center">
  osCASH.me GATE ist ein kostenloser und quelloffener Kryptowährungs-Zahlungsgateway, basierend auf BTCPay Server. Entwickelt für datenschutzorientierte Transaktionen und nahtlose Integration in das osCASH.me Ökosystem.
</p>
<p align="center">
  <a href="https://github.com/osCASHme/oscash-gate">
    <img src="https://img.shields.io/github/v/release/osCASHme/oscash-gate"/>
  </a>
  <a href="https://github.com/osCASHme/oscash-gate/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/osCASHme/oscash-gate"/>
  </a>
  <a href="https://github.com/osCASHme/oscash-gate/issues">
    <img src="https://img.shields.io/badge/PRs-willkommen-brightgreen.svg"/>
  </a>
  <a href="https://recode.at">
    <img src="https://img.shields.io/badge/Community-recode@%20DAO-%23FF6B35"/>
  </a>
</p>

<div align="center">
  <h3>
    <a href="https://osCASH.me">
      Webseite
    </a>
    <span> | </span>
    <a href="./readme/README.de.md">
      Dokumentation
    </a>
    <span> | </span>
    <a href="./docs/API.de.md">
      API
    </a>
    <span> | </span>
    <a href="./CONTRIBUTING.de.md">
      Mitwirken
    </a>
    <span> | </span>
    <a href="https://demo-pay.osCASH.org">
      Demo
    </a>
  </h3>
</div>

<div align="center">
  <sub>"Privatsphäre ist kein Verbrechen - Zahlungen sollten frei sein" 💚
  </a>
</div>
<br/>

<p align="center">
  <a href="https://demo-pay.osCASH.org">Demo ansehen</a>
  ·
  <a href="https://github.com/osCASHme/oscash-gate/issues/new">Fehler melden</a>
  ·
  <a href="https://github.com/osCASHme/oscash-gate/discussions/new">Feature vorschlagen</a>
  ·
  <a href="./readme/FAQ.de.md">FAQ</a>
</p>

## 📋 Inhaltsverzeichnis

* [Über das Projekt](#-über-das-projekt)
* [Funktionen](#-funktionen)
* [Erste Schritte](#-erste-schritte)
* [Installation](#-installation)
* [Dokumentation](#-dokumentation)
* [Mobile Gateway](#-mobile-gateway)
* [Mitwirken](#-mitwirken)
* [Entwicklung](#-entwicklung)
* [Community](#-community)
* [Lizenz](#-lizenz)
* [Danksagungen](#-danksagungen)

## 🎯 Über das Projekt

osCASH.me GATE ist ein Fork des [BTCPay Server](https://github.com/btcpayserver/btcpayserver), speziell angepasst für die Integration mit dem osCASH.me Privacy Messenger. Unser Ziel ist es, sichere und private Zahlungen direkt in verschlüsselte Kommunikation zu integrieren.

### Warum osCASH.me GATE?

- **Privatsphäre First**: Keine KYC, keine Mittelsmänner, keine Überwachung
- **Messenger Integration**: Nahtlose Integration in den osCASH.me Privacy Messenger
- **Community Driven**: Entwickelt von der recode@ /DAO Community
- **Open Source**: Vollständig quelloffen und überprüfbar
- **Self-Hosted**: Behalte die volle Kontrolle über deine Zahlungsinfrastruktur

## 🎨 Funktionen

* **Direkte Peer-to-Peer Bitcoin-Zahlungen**
* **Keine Transaktionsgebühren** (außer Netzwerkgebühren)
* **Keine Gebühren, Mittelsmänner oder KYC**
* **Non-Custodial** (vollständige Kontrolle über private Schlüssel)
* **Erweiterte Privatsphäre & Sicherheit**
* **Self-Hosted Lösung**
* **SegWit-Unterstützung**
* **Lightning Network-Unterstützung** (LND, Core Lightning, Eclair)
* **Tor-Unterstützung**
* **Multi-Tenant fähig** (teile deine Instanz mit Freunden)
* **Mobile Gateway** für osCASH.me App Integration
* **RESTful API** für entwicklerfreundliche Integration
* **Mehrsprachige Unterstützung**

## 🚀 Erste Schritte

### Voraussetzungen

- Docker & Docker Compose
- Bitcoin Full Node (optional, aber empfohlen)
- Lightning Node (optional, für Lightning-Zahlungen)
- SSL-Zertifikat (für Produktionsumgebung)

### Schnellstart

```bash
# Repository klonen
git clone https://github.com/osCASHme/oscash-gate.git
cd oscash-gate

# Mobile Gateway starten
cd mobile-gateway
docker-compose up -d

# Auf https://localhost:3000 zugreifen
```

## 📦 Installation

### Docker Installation (Empfohlen)

```bash
# Docker-Compose Datei herunterladen
wget https://raw.githubusercontent.com/osCASHme/oscash-gate/main/docker-compose.yml

# Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env

# Container starten
docker-compose up -d
```

### Manuelle Installation

Detaillierte Installationsanweisungen findest du in der [Installationsdokumentation](./readme/INSTALL.de.md).

## 📱 Mobile Gateway

Das Mobile Gateway ist eine spezielle Komponente für die Integration mit der osCASH.me App:

```bash
cd mobile-gateway
npm install
npm start
```

**Endpoints:**
- `POST /api/v1/auth/login` - Authentifizierung
- `GET /api/v1/mobile/status` - Verbindungsstatus
- `POST /api/v1/mobile/invoice` - Rechnung erstellen
- `GET /api/v1/mobile/balance` - Kontostand abfragen

Weitere Details findest du in der [Mobile Gateway Dokumentation](./mobile-gateway/README.de.md).

## 📚 Dokumentation

- [Installationsanleitung](./readme/INSTALL.de.md)
- [Konfiguration](./readme/CONFIG.de.md)
- [API Dokumentation](./docs/API.de.md)
- [Mobile Integration](./mobile-gateway/README.de.md)
- [Sicherheit](./SECURITY.de.md)
- [FAQ](./readme/FAQ.de.md)

## 🤝 Mitwirken

Wir freuen uns über Beiträge aus der Community! Siehe [CONTRIBUTING.de.md](./CONTRIBUTING.de.md) für Details.

### Entwicklungsumgebung einrichten

```bash
# Repository forken und klonen
git clone https://github.com/DEIN-USERNAME/oscash-gate.git
cd oscash-gate

# Entwicklungsumgebung starten
./dev-setup.sh

# Tests ausführen
dotnet test
```

## 💻 Entwicklung

### Technologie-Stack

- **Backend**: ASP.NET Core, C#
- **Frontend**: Razor Pages, Blazor
- **Mobile Gateway**: Node.js, Express
- **Datenbank**: PostgreSQL, SQLite
- **Container**: Docker, Docker Compose
- **Bitcoin**: NBXplorer, Bitcoin Core
- **Lightning**: LND, Core Lightning, Eclair

### API

Die osCASH.me GATE API ist vollständig RESTful und dokumentiert:

- [API Dokumentation](./docs/API.de.md)
- [Greenfield API v1](./docs/greenfield-api.de.md)
- [Mobile API](./mobile-gateway/API.de.md)

## 👥 Community

- **Website**: [osCASH.me](https://osCASH.me)
- **GitHub**: [github.com/osCASHme](https://github.com/osCASHme)
- **recode@ /DAO**: [recode.at](https://recode.at)
- **Demo Server**: [demo-pay.osCASH.org](https://demo-pay.osCASH.org)

## 📄 Lizenz

osCASH.me GATE ist unter der MIT-Lizenz lizenziert - siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagungen

- **BTCPay Server Team** - Für die großartige Basis-Software
- **Bitcoin Community** - Für die Vision von finanzieller Freiheit
- **recode@ /DAO Community** - Für die Unterstützung und Zusammenarbeit
- **Alle Mitwirkenden** - Die dieses Projekt möglich machen

---

<div align="center">
  <strong>Gebaut mit ❤️ von der recode@ /DAO Community</strong>
  <br>
  <sub>Für eine Welt mit privaten und freien Zahlungen</sub>
</div>