# Mitwirken bei osCASH.me GATE

Vielen Dank für dein Interesse, bei osCASH.me GATE mitzuwirken! 🎉

## 📋 Inhaltsverzeichnis

- [Code of Conduct](#code-of-conduct)
- [Wie kann ich beitragen?](#wie-kann-ich-beitragen)
- [Entwicklungsumgebung](#entwicklungsumgebung)
- [Pull Request Prozess](#pull-request-prozess)
- [Coding-Standards](#coding-standards)
- [Commit-Nachrichten](#commit-nachrichten)
- [Community](#community)

## 📜 Code of Conduct

Wir verpflichten uns zu einem offenen und einladenden Umfeld. Bitte lies unseren [Code of Conduct](CODE_OF_CONDUCT.de.md).

## 🤝 Wie kann ich beitragen?

### Bug Reports

1. **Prüfe existierende Issues** - Vielleicht wurde dein Problem bereits gemeldet
2. **Erstelle einen neuen Issue** mit:
   - Klarer Titel und Beschreibung
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - System-Informationen (OS, Version, etc.)
   - Screenshots/Logs wenn relevant

### Feature Requests

1. **Diskutiere zuerst** - Eröffne eine Discussion im GitHub Discussions Bereich
2. **Beschreibe den Use Case** - Warum ist dieses Feature wichtig?
3. **Mögliche Implementierung** - Wenn du Ideen hast, teile sie!

### Code-Beiträge

1. **Fork das Repository**
2. **Erstelle einen Feature-Branch** (`git checkout -b feature/AmazingFeature`)
3. **Entwickle und teste** deine Änderungen
4. **Commit** mit aussagekräftigen Nachrichten
5. **Push** zu deinem Fork
6. **Erstelle einen Pull Request**

## 🛠️ Entwicklungsumgebung

### Voraussetzungen

```bash
# .NET SDK 8.0
dotnet --version

# Node.js 18+
node --version

# Docker & Docker Compose
docker --version
docker-compose --version
```

### Setup

```bash
# Repository klonen
git clone https://github.com/osCASHme/oscash-gate.git
cd oscash-gate

# Abhängigkeiten installieren
dotnet restore
cd mobile-gateway && npm install && cd ..

# Entwicklungsumgebung starten
./dev-setup.sh
```

### Tests ausführen

```bash
# Backend Tests
dotnet test

# Mobile Gateway Tests
cd mobile-gateway
npm test

# Integration Tests
docker-compose -f docker-compose.test.yml up
```

## 🔄 Pull Request Prozess

### Vor dem PR

1. **Rebase auf main** - Stelle sicher, dass dein Branch aktuell ist
2. **Tests schreiben** - Neue Features brauchen Tests
3. **Dokumentation** - Aktualisiere README/Docs wenn nötig
4. **Lint & Format** - Code sollte den Standards entsprechen

### PR-Checkliste

- [ ] Code kompiliert ohne Warnungen
- [ ] Alle Tests bestehen
- [ ] Dokumentation aktualisiert
- [ ] Commit-Nachrichten folgen den Standards
- [ ] PR hat aussagekräftigen Titel und Beschreibung

### Review-Prozess

1. **Automatische Checks** - CI/CD muss grün sein
2. **Code Review** - Mindestens 1 Approval erforderlich
3. **Feedback einarbeiten** - Konstruktives Feedback ist willkommen
4. **Merge** - Maintainer führen den Merge durch

## 📝 Coding-Standards

### C# / .NET

```csharp
// Verwende aussagekräftige Namen
public class PaymentProcessor
{
    private readonly ILogger<PaymentProcessor> _logger;
    
    // XML-Dokumentation für öffentliche APIs
    /// <summary>
    /// Processes a payment transaction
    /// </summary>
    /// <param name="invoice">The invoice to process</param>
    /// <returns>Transaction result</returns>
    public async Task<TransactionResult> ProcessPaymentAsync(Invoice invoice)
    {
        // Implementierung...
    }
}
```

### JavaScript/TypeScript

```javascript
// ESLint & Prettier Konfiguration verwenden
const processPayment = async (invoice) => {
  try {
    // Validierung zuerst
    validateInvoice(invoice);
    
    // Dann Business Logic
    const result = await paymentGateway.process(invoice);
    
    return result;
  } catch (error) {
    logger.error('Payment processing failed', { error, invoice });
    throw error;
  }
};
```

### Allgemeine Regeln

- **KISS** - Keep It Simple, Stupid
- **DRY** - Don't Repeat Yourself
- **SOLID** - Prinzipien befolgen
- **Tests** - Schreibe testbaren Code
- **Kommentare** - Code sollte selbsterklärend sein, Kommentare erklären das "Warum"

## 💬 Commit-Nachrichten

Wir folgen den [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` Neues Feature
- `fix:` Bugfix
- `docs:` Dokumentation
- `style:` Formatierung (keine Funktionsänderung)
- `refactor:` Code-Refactoring
- `test:` Tests hinzufügen/ändern
- `chore:` Maintenance

### Beispiele

```bash
feat(mobile-gateway): add WebSocket support for real-time updates

Implemented WebSocket connections for real-time payment status updates.
This allows the mobile app to receive instant notifications when
payments are confirmed.

Closes #123
```

```bash
fix(lightning): resolve connection timeout with LND

Increased timeout from 10s to 30s to handle slower connections.
Added retry logic with exponential backoff.

Fixes #456
```

## 🌍 Übersetzungen

Hilf uns, osCASH.me GATE in deine Sprache zu übersetzen:

1. **Kopiere** `language/en.json`
2. **Benenne** in deine Sprache (z.B. `de.json`)
3. **Übersetze** alle Strings
4. **Teste** die Übersetzung in der App
5. **Erstelle PR** mit der neuen Datei

## 🐛 Debugging

### Logs

```bash
# Backend Logs
dotnet run --verbosity detailed

# Mobile Gateway Logs
DEBUG=* npm run dev

# Docker Logs
docker-compose logs -f
```

### Entwickler-Tools

- **Visual Studio / VS Code** - IDE Setup
- **Postman / Insomnia** - API Testing
- **ngrok** - Webhook Testing
- **Redis Commander** - Cache Debugging

## 👥 Community

### Kommunikation

- **GitHub Discussions** - Für Features und Ideen
- **GitHub Issues** - Für Bugs und Tasks
- **recode@ /DAO** - [recode.at](https://recode.at)

### Maintainer

- @osCASHme/core-team
- Siehe [CODEOWNERS](.github/CODEOWNERS)

## 🎉 Anerkennung

Alle Mitwirkenden werden in:
- [Contributors Liste](https://github.com/osCASHme/oscash-gate/graphs/contributors)
- README.md Credits-Sektion
- Release Notes

## 📄 Lizenz

Durch das Beitragen zu osCASH.me GATE stimmst du zu, dass deine Beiträge unter der MIT-Lizenz lizenziert werden.

---

<div align="center">
  <strong>Danke für deinen Beitrag! 🙏</strong>
  <br>
  <sub>Gemeinsam bauen wir die Zukunft privater Zahlungen</sub>
</div>