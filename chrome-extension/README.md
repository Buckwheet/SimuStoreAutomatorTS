# SimuStore Automator — Chrome Extension

A lightweight Chrome extension that adds bulk-buy functionality directly to the SimuCoins store. No server, no Node.js, no Puppeteer — just install and go.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select this `chrome-extension` folder
5. Navigate to https://store.play.net/store/purchase/gs

A floating panel will appear on any SimuCoins store purchase page.

## Usage

1. Click **Refresh Items** to scan the current page
2. Set quantities and click **Buy** for immediate purchase, or **+Cart** to queue
3. Switch to the **Cart** tab and click **Buy All** to purchase everything
4. The panel is draggable — grab the header to reposition it

## How It Works

The extension runs as a content script on `store.play.net/store/purchase/*` pages. It uses your existing login session (cookies) to make the same purchase requests the store's own UI makes — just in a loop with a 2-second delay between each.

No data leaves your browser. No external servers are contacted. The full source is in `content.js`.

## Notes

- Replace `icon48.png` and `icon128.png` with proper icons before publishing
- The 2-second delay between purchases is hardcoded in `content.js` (`DELAY_MS`)
- Works on any store page that uses the `.general_item_wrapper` layout
