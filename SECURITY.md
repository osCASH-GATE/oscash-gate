# Security Policy

## 🛡️ Sicherheitsrichtlinien für osCASH.me GATE

Die Sicherheit ist ein zentraler Aspekt von osCASH.me GATE. Wir nehmen Sicherheitsprobleme sehr ernst.

## 📋 Unterstützte Versionen

| Version | Unterstützung |
| ------- | ------------ |
| 1.0.x-oscash | ✅ Vollständig unterstützt |
| < 1.0.0 | ❌ Nicht unterstützt |

## 🔍 Sicherheitslücken melden

### Verantwortungsvolle Offenlegung

Wenn du eine Sicherheitslücke findest:

1. **Melde es NICHT öffentlich** über GitHub Issues
2. **Sende eine E-Mail** an: security@oscash.me
3. **Gib uns Zeit** für eine Antwort (48-72 Stunden)

### Was in deinen Bericht gehört

- Beschreibung der Schwachstelle
- Schritte zur Reproduktion
- Potenzielle Auswirkungen
- Screenshots/Logs (wenn relevant)
- Deine Kontaktinformationen

## ⚡ Schweregrade

### 🔴 Kritisch (24h Response)
- Remote Code Execution
- Authentifizierungs-Bypass
- Finanzielle Schäden möglich

### 🟠 Hoch (72h Response)
- Cross-Site Scripting (XSS)
- Privilege Escalation
- Datenlecks

### 🟡 Mittel (7 Tage Response)
- Information Disclosure
- Denial of Service (DoS)

### 🟢 Niedrig (30 Tage Response)
- Konfigurationsfehler
- Best-Practice-Verletzungen

## 🔒 Sicherheitsmaßnahmen

- Automatisierte Code-Scans
- Dependency Scanning
- Code Reviews für alle Änderungen
- Container-Scanning für Docker Images
- HTTPS-Enforcing
- Input Validation
- Rate Limiting

---

<div align="center">
  <strong>Sicherheit ist eine gemeinsame Verantwortung</strong>
</div>