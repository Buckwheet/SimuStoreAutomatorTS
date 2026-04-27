# SimuStore Automator (TypeScript Edition)

Bulk-purchase items from the [SimuCoins Store](https://store.play.net/store/purchase/gs) without clicking "Buy" dozens of times. The store only allows one item per transaction — this tool automates the repetitive clicking so you can buy 20, 50, or more in one go.

Two options are included:

| Option | Requires Node.js? | How it works |
|---|---|---|
| **Server + Web UI** | Yes | Launches a local Express server with a Puppeteer-controlled browser |
| **Chrome Extension** | No | Injects a panel directly into the store page |

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Chrome Extension](#chrome-extension)
- [Project Structure](#project-structure)
- [Development](#development)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## How It Works

1. The server launches a real Chrome window via [Puppeteer](https://pptr.dev/).
2. You log in to the SimuCoins store manually — the tool **never** sees your credentials.
3. The web UI at `http://localhost:3000` scrapes the store page for available items.
4. When you click **Buy Now** or **Checkout All**, the server replays the store's own purchase POST request in a loop with a configurable delay between each.

All traffic stays between your machine and `store.play.net`. Nothing is sent to any third party.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Your Browser (http://localhost:3000)                 │
│  ┌────────────────────────────────────────────────┐  │
│  │  Web UI  (public/index.html)                   │  │
│  │  - Item list, cart, progress bar               │  │
│  │  - Streams purchase progress via chunked JSON  │  │
│  └──────────────┬─────────────────────────────────┘  │
│                 │ fetch /api/*                        │
│                 ▼                                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  Express Server  (src/server.ts)               │  │
│  │  - Auth token injected per session             │  │
│  │  - Concurrency lock (one purchase at a time)   │  │
│  │  - Streams progress back to the UI             │  │
│  └──────────────┬─────────────────────────────────┘  │
│                 │ Puppeteer                           │
│                 ▼                                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  Automated Chrome  (src/automation.ts)         │  │
│  │  - page.evaluate() runs fetch() inside the     │  │
│  │    browser using your logged-in session         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
         All on localhost — nothing leaves your machine
```

---

## Prerequisites

- **Node.js 18+** — download the LTS version from [nodejs.org](https://nodejs.org/) (npm is included)
- **Google Chrome** — Puppeteer will use a bundled Chromium, but a local Chrome install is recommended

---

## Installation

1. **Clone or download** the repository:
   ```bash
   git clone git@github.com:Buckwheet/SimuStoreAutomatorTS.git
   cd SimuStoreAutomatorTS
   ```
   Or click **Code → Download ZIP** on GitHub and extract it.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the TypeScript:**
   ```bash
   npm run build
   ```

---

## Usage

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open the UI** at [http://localhost:3000](http://localhost:3000).

3. Click **Launch Browser** — a Chrome window opens.

4. **Log in** to the SimuCoins store manually in that window.

5. **Navigate** to the store page you want to buy from (e.g. `https://store.play.net/store/purchase/gs`).

6. Back in the UI, click **Refresh List** to load available items.

7. **Purchase:**
   - **Single item** — set quantity, click **Buy Now**.
   - **Multiple items** — add items to the cart, open the cart, click **Checkout All**.

8. When finished, click **Stop Service** to shut down cleanly.

> **Do not interact with the automated Chrome window while a purchase is running.** Navigating away or closing the tab will cause remaining purchases to fail. You can use other windows freely.

---

## Environment Variables

Set these before running `npm start` to override defaults. A `.env` file is gitignored if you prefer that approach.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the Express server listens on |
| `PURCHASE_DELAY_MS` | `2000` | Milliseconds to wait between each purchase request |
| `STORE_URL` | `https://store.play.net/store/purchase/gs` | URL the automated browser navigates to on launch |

Example:
```bash
PORT=8080 PURCHASE_DELAY_MS=3000 npm start
```

---

## Chrome Extension

A standalone alternative that requires **no server and no Node.js**. It injects a floating panel directly into the SimuCoins store page.

See [`chrome-extension/README.md`](chrome-extension/README.md) for installation and usage.

---

## Project Structure

```
SimuStoreAutomatorTS/
├── src/
│   ├── server.ts          # Express server, API routes, auth, graceful shutdown
│   └── automation.ts      # Puppeteer browser control, scraping, purchase logic
├── dist/                  # Compiled JS (generated by `npm run build`)
├── public/
│   └── index.html         # Web UI (single-page, no framework)
├── chrome-extension/
│   ├── manifest.json      # Chrome MV3 manifest
│   ├── content.js         # Content script — the entire extension logic
│   ├── content.css        # Panel styles
│   └── README.md          # Extension-specific docs
├── package.json
├── tsconfig.json          # TypeScript config (ES2020, strict)
├── biome.json             # Biome linter/formatter config
└── .husky/pre-commit      # Runs `npx biome check` before each commit
```

---

## Development

**Dev mode** (auto-restarts on file changes via nodemon + ts-node):
```bash
npm run dev
```

**Build** (compile TypeScript to `dist/`):
```bash
npm run build
```

**Lint & format** (Biome runs automatically on pre-commit via Husky):
```bash
npx biome check --write .
```

### Tooling

| Tool | Purpose |
|---|---|
| [TypeScript](https://www.typescriptlang.org/) | Type safety, strict mode enabled |
| [Biome](https://biomejs.dev/) | Linter + formatter (replaces ESLint + Prettier) |
| [Husky](https://typicode.github.io/husky/) | Git hooks — runs Biome on pre-commit |
| [nodemon](https://nodemon.io/) | Auto-restart during development |
| [Puppeteer](https://pptr.dev/) | Headless/headed Chrome automation |

---

## Security

- **Localhost only** — the server binds to `127.0.0.1`, not `0.0.0.0`. It is not accessible from other machines on your network.
- **Auth token** — a random 256-bit token is generated on each server start and injected into the UI. All `/api/*` requests require this token. This prevents other tabs or local processes from making unauthorized requests (CSRF protection).
- **No credentials stored** — you log in manually. The tool never asks for or handles your username or password.
- **Concurrency lock** — only one purchase operation can run at a time, preventing accidental parallel purchases.
- **XSS-safe UI** — the frontend uses `createElement`/`textContent` instead of `innerHTML` for dynamic content.
- **Response validation** — purchase responses are checked for failure indicators (`insufficient`, `unable to purchase`, `error`) before reporting success.
- **Graceful shutdown** — `SIGINT`/`SIGTERM` close the browser and drain HTTP connections before exiting.
- **Open source** — read `src/server.ts` and `src/automation.ts` yourself. There is no obfuscated code.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| **"Browser disconnected"** | The automated Chrome window was closed. Click **Launch Browser** again. |
| **"No items found"** | Make sure the automated browser is on a store page with items (e.g. `/store/purchase/gs`) before clicking Refresh. |
| **"A purchase is already in progress"** | Wait for the current purchase to finish, or restart the server. |
| **"Forbidden" (403)** | The auth token is invalid. Refresh the UI page — a new token is injected on each page load. |
| **Port already in use** | Another process is using port 3000. Set `PORT=3001 npm start` or stop the other process. |

---

## Disclaimer

**Use responsibly.** This tool automates purchases on your own account using your own session.

- **Keep quantities reasonable.** Small, sensible batches. Rapid-fire bulk requests could get your account flagged.
- **No liability.** This software is provided **as-is, with no warranty**. The authors are not responsible for incorrect purchases, lost SimuCoins, account actions by Simutronics, or any other damages.
- **Not affiliated with Simutronics.** This is an independent community tool. It is not endorsed or supported by Simutronics.
- **Use at your own risk.** By using this tool you accept full responsibility for any actions performed on your account.

---

## License

[ISC](https://opensource.org/licenses/ISC) — see `package.json` for details.
