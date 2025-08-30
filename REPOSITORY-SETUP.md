# osCASH-GATE Repository Setup

## 📋 Repository-Struktur für GitHub-Veröffentlichung

### Quelle
- **Upstream**: https://github.com/btcpayserver/btcpayserver (Original BTCPay Server)
- **Fork**: https://github.com/osCASH-GATE/btcpayserver (Unsere Basis)
- **Lokal**: `/home/mayer/prog/claude/osCASH.me/osCASH-GATE/oscash-gate/`

### Ziel
- **Repository**: https://github.com/osCASH-GATE/oscash-gate
- **Zweck**: Eigenständiges osCASH.me GATE Projekt

## 🚨 **SECURITY AUDIT - KRITISCH VOR VERÖFFENTLICHUNG**

⚠️ **PFLICHT**: Vollständiges Sicherheits-Audit durchgeführt und bestanden ✅
- Siehe: `/home/mayer/prog/claude/osCASH.me/SECURITY-GUIDELINES-FOR-RELEASES.md`
- Alle .env Dateien zu .env.example konvertiert
- .gitignore für sensible Daten erweitert  
- Code-Audit für hardcoded Secrets durchgeführt
- Git-History auf versehentliche Secret-Commits geprüft

**🔒 Status: SICHER FÜR VERÖFFENTLICHUNG** ✅

## 🔧 Vorbereitung für Veröffentlichung

### 1. Repository-Metadaten aktualisieren

```bash
# Git Remote für neues Repository hinzufügen
cd /home/mayer/prog/claude/osCASH.me/osCASH-GATE/oscash-gate
git remote add oscash-gate https://github.com/osCASH-GATE/oscash-gate.git

# Aktuelle Remotes prüfen
git remote -v
```

### 2. Dateien für Veröffentlichung

#### Zu aktualisieren:
- [x] README.md - Hauptdokumentation (Deutsch/Englisch)
- [x] README.de.md - Deutsche Version erstellt  
- [x] CONTRIBUTING.de.md - Mitwirkungsrichtlinien
- [x] readme/INSTALL.de.md - Installationsanleitung
- [x] mobile-gateway/README.de.md - Mobile Gateway Docs

#### Zusätzlich benötigt:
- [ ] .github/ISSUE_TEMPLATE/ - Issue Templates
- [ ] .github/workflows/ - CI/CD Workflows
- [ ] CODE_OF_CONDUCT.md - Community Richtlinien
- [ ] SECURITY.md - Sicherheitsrichtlinien
- [ ] CHANGELOG.md - Versionshistorie
- [ ] .gitignore - Angepasst für osCASH.me

### 3. Branding aktualisieren

#### Zu ändern:
- [ ] BTCPay Server → osCASH.me GATE (in allen Dateien)
- [ ] Links zu btcpayserver.org → osCASH.me
- [ ] GitHub Links auf osCASH-GATE Organization
- [ ] Docker Images und Tags

### 4. Mobile Gateway Integration

#### Spezielle osCASH.me Features:
- [x] Mobile-optimierte API
- [x] WebSocket Support
- [x] JWT Authentication
- [x] CORS für osCASH.me App

## 📁 Verzeichnisstruktur

```
oscash-gate/
├── .github/                     # GitHub-spezifische Dateien
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── CODEOWNERS
├── readme/                      # Deutsche Dokumentation
│   ├── INSTALL.de.md
│   ├── CONFIG.de.md
│   └── FAQ.de.md
├── language/                    # Übersetzungen
│   ├── de.json
│   └── en.json
├── mobile-gateway/              # Mobile API Gateway
│   ├── README.de.md
│   ├── API.de.md
│   └── src/
├── docs/                        # API Dokumentation
│   ├── API.de.md
│   └── greenfield-api.de.md
├── BTCPayServer/               # Hauptanwendung (von BTCPay geerbt)
├── README.md                   # Hauptdokumentation (Englisch)
├── README.de.md               # Deutsche Version
├── CONTRIBUTING.de.md         # Mitwirkungsrichtlinien
├── SECURITY.md               # Sicherheitsrichtlinien
├── CODE_OF_CONDUCT.md       # Community-Richtlinien
├── CHANGELOG.md             # Versionshistorie
└── docker-compose.yml       # Container-Setup
```

## 🏷️ Tagging-Strategie

### Version-Schema
```
v1.0.0-oscash-alpha.1
│ │ │  │      │      │
│ │ │  │      │      └─ Patch/Build
│ │ │  │      └─ Alpha/Beta/RC
│ │ │  └─ osCASH.me Identifier
│ │ └─ Minor (Features)
│ └─ Patch (Bugfixes)
└─ Major (Breaking Changes)
```

### Beispiele
- `v1.0.0-oscash-alpha.1` - Erste Alpha-Version
- `v1.0.0-oscash-beta.1` - Beta-Version
- `v1.0.0-oscash` - Erste stabile Version
- `v1.1.0-oscash` - Feature-Update

## 🚀 Release-Prozess

### 1. Vorbereitung
```bash
# Alle Änderungen committen
git add .
git commit -m "docs: prepare for initial osCASH.me GATE release

- Add German documentation
- Update branding from BTCPay to osCASH.me GATE  
- Add mobile gateway integration
- Prepare repository structure for public release"

# Tag erstellen
git tag -a v1.0.0-oscash-alpha.1 -m "osCASH.me GATE v1.0.0 Alpha 1

First public alpha release of osCASH.me GATE, based on BTCPay Server.

Features:
- Mobile Gateway for osCASH.me App integration
- German documentation and localization
- HTTPS/SSL support with osCASH.org domains
- Privacy-focused payment processing

Born on August 30, 2025 - recode@ /DAO Community"
```

### 2. Push to GitHub
```bash
# Push main branch
git push oscash-gate main

# Push tags
git push oscash-gate --tags
```

### 3. GitHub Release erstellen
- Release Notes auf Deutsch und Englisch
- Docker Images verlinken
- Installation Guide verlinken
- Demo-Server erwähnen

## 📊 Repository-Metriken

### Erwartete Struktur:
- **Sprachen**: C# (80%), JavaScript (15%), Other (5%)
- **Größe**: ~50MB (ohne .git)
- **Dateien**: ~2000+ (BTCPay Basis + osCASH Extensions)
- **Branches**: main, develop, feature/* 

### Community-Features:
- Issues Templates
- Discussion Categories
- Security Policy
- Code of Conduct
- Contributing Guidelines

## 🔗 Wichtige Links

### Nach Veröffentlichung zu aktualisieren:
- README Badges → osCASH-GATE/oscash-gate
- Demo URLs → demo-pay.osCASH.org
- Documentation → docs.oscash.me
- Community → recode.at

---

**Status**: Bereit für GitHub-Veröffentlichung
**Ziel**: https://github.com/osCASH-GATE/oscash-gate  
**Datum**: 30. August 2025 - Geburtstag des osCASH.me GATE 🎂