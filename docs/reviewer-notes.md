# Reviewer Notes — SimuStore Automator

Paste-ready notes for store reviewers. Use for the AMO "Notes to reviewers" field (or equivalent) when submitting `dist-ext/firefox-1.1.0.zip`, `chrome-1.1.0.zip` (CWS), or `edge-1.1.0.zip` (Edge Add-ons).

---

## Notes to reviewers

SimuStore Automator is a single-purpose **content-script extension (Manifest V3)** that adds bulk-buy controls to the SimuCoins store (`store.play.net`). The store only allows one item per transaction, so the extension replays the store's own `POST /store/PurchaseItemConfirmed` request in a loop (2-second delay between purchases) using the user's existing logged-in session. Everything is user-initiated — nothing runs until the user clicks Buy/Buy All on a store purchase page.

### Source & build (exact reproduction)

- **Source:** https://github.com/Buckwheet/SimuStoreAutomatorTS (extension-only repository). The packaged files are **byte-identical** to `chrome-extension/` in the repo — no bundling, minification, or obfuscation.
- **Build instructions** (also in the root `README.md` and the packaged `chrome-extension/README.md`):
  ```bash
  git clone https://github.com/Buckwheet/SimuStoreAutomatorTS.git
  cd SimuStoreAutomatorTS
  npm ci
  npm run build:ext
  ```
  Output: `dist-ext/firefox-1.1.0.zip` (etc.). `scripts/build-extensions.mjs` simply zips the `chrome-extension/` folder.

### What to verify / bear in mind

- `permissions` is `[]` — no storage, cookies, tabs, background, webRequest, or any other permission. Zero `chrome.*` API usage.
- `host_permissions` is limited to `https://store.play.net/*`; the content script matches only `/store/purchase/*` pages.
- No remote code, no `eval`/`new Function`, no background service worker, no external network calls — every `fetch()` targets `store.play.net`.
- `data_collection_permissions: { "required": ["none"] }` — declared and accurate: no data is collected or transmitted to any third party. The only requests are the store's own purchase endpoint with the user's session cookies.
- The only DOM access is to the store's own purchase page (item names, prices, IDs) to build the bulk-buy UI.
- The repository's git history contains an earlier, now-removed local Node.js server variant (removed 2026-08-07 when the repo became extension-only). The current tree is the submitted artifact.
- Not affiliated with or endorsed by Simutronics. This is an independent community tool; users accept responsibility for their account actions (disclaimer in the listing copy and README).

---

## Changelog of this file

- 2026-08-07: initial reviewer notes (AMO submission prep).
