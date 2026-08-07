# SimuStore Automator

Bulk-purchase items from the [SimuCoins Store](https://store.play.net/store/purchase/gs) without clicking "Buy" dozens of times. The store only allows one item per transaction — this browser extension automates the repetitive clicking so you can buy 20, 50, or more in one go.

The extension runs entirely in your browser. No server, no Node.js, nothing to install beyond the extension itself.

---

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Disclaimer](#disclaimer)
- [Support](#support)
- [License](#license)

---

## Installation

**Store links:** Chrome Web Store, Edge Add-ons, and Firefox AMO listings are pending. This page will be updated when the extension is live.

**Development / manual install** (Chrome or Edge):

1. Download or clone this repository.
2. Open `chrome://extensions/` (or `edge://extensions/`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `chrome-extension/` folder.
5. Navigate to any SimuCoins store purchase page (e.g. `https://store.play.net/store/purchase/gs`).

A floating **SimuStore Automator** panel appears in the bottom-right corner of the page.

See [`chrome-extension/README.md`](chrome-extension/README.md) for full extension documentation.

---

## Usage

1. **Refresh Items** — scans the current store page for purchasable items.
2. Set a quantity for any item, then:
   - **Buy** — purchases that item immediately.
   - **+Cart** — adds it to the cart for batch checkout.
3. Switch to the **Cart** tab to review queued items.
4. Click **Buy All** to purchase everything in the cart sequentially (a configurable delay between purchases, default 2 seconds).
5. A progress bar tracks completion; the status line shows which item is being purchased and reports failures inline.

> **Do not navigate away or close the tab while a purchase is running** — remaining purchases will fail. You can use other tabs freely.

---

## Project Structure

```
SimuStoreAutomatorTS/
├── chrome-extension/       # The extension (MV3 manifest, content script, styles)
├── scripts/                # Build scripts (extension zips)
├── test/                   # Vitest unit tests
├── docs/                   # Store listing copy and release docs
├── package.json
├── biome.json              # Biome linter/formatter config
└── .husky/pre-commit       # Runs lint + tests before each commit
```

---

## Development

**Install dependencies (lockfile-pinned for exact reproduction):**
```bash
npm ci
```

**Run tests** (Vitest):
```bash
npm test
```

**Lint & format** (Biome):
```bash
npx biome lint .
npx biome check .
```

**Build extension zips** (Chrome/Edge + Firefox, named `*-1.1.0.zip`):
```bash
npm run build:ext
```

**Lint the extension** (Mozilla's web-ext):
```bash
npx web-ext lint --source-dir chrome-extension
```

Lint, format checks, and tests all run automatically on every commit via Husky.

---

## Security

- **Zero permissions** — the manifest's `permissions` array is empty.
- **No data collection** — no analytics, no telemetry. The only network calls are the store's own purchase requests using your existing login session.
- **Store-only scope** — the single `host_permissions` entry is `https://store.play.net/*`, so the panel can run on the store and nowhere else.
- **No credentials stored** — you are already logged in; the extension never asks for or handles your username or password.
- **Open source** — read `chrome-extension/content.js` yourself. No obfuscated code.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| **Panel doesn't appear** | Make sure you're on a store purchase page (e.g. `/store/purchase/gs`), the extension is enabled, and reload the page. |
| **"No items found"** | Make sure you're on a store page that lists items before clicking **Refresh Items**. |
| **Purchase fails** | Check the status line for the failure reason (e.g. `insufficient` funds). The store only allows one item per transaction — wait for the delay between purchases. |

---

## Disclaimer

**Use responsibly.** This tool automates purchases on your own account using your own session.

- **Keep quantities reasonable.** Small, sensible batches. Rapid-fire bulk requests could get your account flagged.
- **No liability.** This software is provided **as-is, with no warranty**. The authors are not responsible for incorrect purchases, lost SimuCoins, account actions by Simutronics, or any other damages.
- **Not affiliated with Simutronics.** This is an independent community tool. It is not endorsed or supported by Simutronics.
- **Use at your own risk.** By using this tool you accept full responsibility for any actions performed on your account.

---

## Support

Free forever. If this saves you time, a coffee is appreciated.

[![Sponsor](https://img.shields.io/github/sponsors/Buckwheet?label=Sponsor)](https://github.com/sponsors/Buckwheet)

---

## License

[ISC](https://opensource.org/licenses/ISC) — see `package.json` for details.
