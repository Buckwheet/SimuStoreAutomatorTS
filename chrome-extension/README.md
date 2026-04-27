# SimuStore Automator — Chrome Extension

A lightweight Chrome extension that adds bulk-buy controls directly to the SimuCoins store page. No server, no Node.js, no Puppeteer — just install and go.

---

## Installation

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select this `chrome-extension/` folder.
5. Navigate to any SimuCoins store purchase page (e.g. `https://store.play.net/store/purchase/gs`).

A floating **SimuStore Automator** panel will appear in the bottom-right corner of the page.

---

## Usage

1. **Refresh Items** — scans the current page for purchasable items.
2. Set a quantity for any item, then:
   - **Buy** — purchases that item immediately.
   - **+Cart** — adds it to the cart for batch checkout.
3. Switch to the **Cart** tab to review queued items.
4. Click **Buy All** to purchase everything in the cart sequentially.
5. The panel is **draggable** — grab the header bar to reposition it.

### Progress & Status

- A progress bar tracks completion during purchases.
- The status line shows which item is being purchased and reports failures inline.
- Buttons are disabled while a purchase is running to prevent double-triggers.

---

## How It Works

The extension runs as a **content script** on `store.play.net/store/purchase/*` pages (Manifest V3). It:

1. Scrapes item data from `.general_item_wrapper` elements on the page.
2. Replays the store's own `POST /store/PurchaseItemConfirmed` request using your existing login session (cookies via `credentials: "include"`).
3. Waits a configurable delay between each purchase (default: 2 seconds).
4. Validates each response for failure indicators (`insufficient`, `unable to purchase`, `error`).

**No data leaves your browser.** No external servers are contacted. The full source is in `content.js` — read it yourself.

---

## Configuration

| Setting | Location | Default | Description |
|---|---|---|---|
| `DELAY_MS` | Top of `content.js` | `2000` | Milliseconds between each purchase request |

To change the delay, edit the `DELAY_MS` constant in `content.js` and reload the extension.

---

## File Structure

```
chrome-extension/
├── manifest.json   # Chrome MV3 manifest — permissions, content script registration
├── content.js      # All extension logic — scraping, purchasing, UI panel
├── content.css     # Panel styles (floating overlay, tabs, progress bar)
├── icon48.png      # Toolbar icon (48×48) — placeholder
├── icon128.png     # Store listing icon (128×128) — placeholder
└── README.md       # This file
```

---

## Notes

- Replace `icon48.png` and `icon128.png` with proper icons before publishing to the Chrome Web Store.
- The extension requests **no special permissions** — only `host_permissions` for `store.play.net`.
- Works on any store page that uses the `.general_item_wrapper` layout.
- The panel auto-injects on page load and prevents duplicate injection if the page is re-navigated.

---

## Comparison with the Server Version

| Feature | Chrome Extension | Server + Web UI |
|---|---|---|
| Requires Node.js | No | Yes |
| Requires installation | Load unpacked in Chrome | `npm install && npm run build` |
| Works without a terminal | Yes | No |
| Separate browser window | No (runs in your tab) | Yes (Puppeteer-controlled Chrome) |
| Configurable delay | Edit `content.js` | Environment variable |
| Auth token / CSRF protection | N/A (same-origin) | Yes |

Choose the extension for simplicity. Choose the server version if you want a dedicated UI or plan to extend the automation further.

---

## Security Audit

Chrome extensions can be dangerous — malicious ones have been caught stealing auth tokens, cookies, and session data from other websites. This extension is designed to be fully auditable so you can verify it yourself in minutes.

### What this extension CAN access

- The DOM of `store.play.net/store/purchase/*` pages (to read item names, prices, and IDs)
- The store's own purchase endpoint (`POST /store/PurchaseItemConfirmed`) using your existing login session

### What this extension CANNOT access

- **Any other website.** The manifest restricts it to `store.play.net` only. Chrome enforces this at the browser level.
- **Your cookies.** The `permissions` array is empty — no `cookies` permission is requested.
- **Other tabs.** No `tabs`, `activeTab`, or `webNavigation` permissions.
- **Network traffic.** No `webRequest` or `webRequestBlocking` permissions.
- **Local storage from other sites.** No `storage` permission, no cross-origin access.

### What the code does NOT contain

You can verify all of this by reading `content.js` (311 lines, unminified, unobfuscated):

- **No background script or service worker.** Nothing runs when you're not on the store page.
- **No Chrome API calls.** Zero use of `chrome.runtime`, `chrome.cookies`, `chrome.storage`, `chrome.tabs`, or any other `chrome.*` API.
- **No external network requests.** Every `fetch()` call goes to `https://store.play.net/...` and nowhere else. No analytics, no telemetry, no phone-home.
- **No `eval()`, `new Function()`, or dynamic script injection.** No obfuscated or dynamically generated code.
- **No data exfiltration patterns.** No `navigator.sendBeacon()`, no `new Image().src`, no hidden iframes, no WebSocket connections.

### Manifest permissions breakdown

```json
{
  "permissions": [],                                          // ← empty, no special powers
  "host_permissions": ["https://store.play.net/*"],           // ← only this domain
  "content_scripts": [{
    "matches": ["https://store.play.net/store/purchase/*"]    // ← only purchase pages
  }]
}
```

### How to verify

1. Open `manifest.json` — confirm `permissions` is `[]` and `host_permissions` only lists `store.play.net`.
2. Open `content.js` — search for `fetch(`. Every call goes to `store.play.net`. There are no other URLs.
3. Search for `chrome.` — zero results. The extension uses no Chrome APIs.
4. Search for `eval`, `Function(`, `sendBeacon`, `WebSocket`, `new Image` — zero results.

If you find anything that contradicts the above, please open an issue.
