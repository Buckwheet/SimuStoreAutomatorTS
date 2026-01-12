# SimuStore Automator (TypeScript Edition)

A simple tool to help you buy items in bulk from the SimuCoins store. This version is rebuilt in TypeScript for better safety and reliability.

## What it does
The SimuCoins store only allows you to buy one item at a time. This tool lets you:
1.  Select an item.
2.  Choose a quantity (e.g., 20 or 50).
3.  Automatically purchase them one by one for you with a safety delay.

## Prerequisites

Before you start, you need **Node.js** installed on your computer.
1.  Go to [nodejs.org](https://nodejs.org/).
2.  Download and install the **LTS** version.
    *   *Note: This automatically installs **npm** (Node Package Manager) which is required.*
3.  Follow the installer prompts (clicking Next until finished).

## Installation (Step-by-Step)

1.  **Download and Extract**
    *   Click the green **Code** button on GitHub and select **Download ZIP**.
    *   Find the ZIP file in your Downloads folder.
    *   Right-click it and choose **Extract All...**.
    *   Extract it to a folder you will look at (e.g., inside Documents).

2.  **Open the Terminal inside the Folder**
    *   **Crucial Step**: You need to run commands *inside* the folder you just extracted.
    *   Open your file explorer and go into the folder.
    *   **Easiest Way**: Hold the **Shift** key, **Right-Click** on an empty white space in the folder window, and select **"Open PowerShell window here"** or **"Open in Terminal"**.

3.  **Install Tools**
    *   In the blue or black window that popped up, type this and press Enter:
        ```bash
        npm install
        ```
    *   Wait for it to finish downloading dependencies.

4.  **Build the Project**
    *   Since this is a TypeScript project, you need to compile it once before running:
        ```bash
        npm run build
        ```

## How to Use

1.  Start the tool by running this command in your terminal:
    ```bash
    npm start
    ```
    *   *Alternatively, for developers making changes, you can use `npm run dev`.*

2.  Open your web browser and go to: [http://localhost:3000](http://localhost:3000)
3.  Click the **"Launch Browser"** button.
    *   A new Chrome window will open.
4.  **Log In** to the store in that new window manually.
5.  **Navigate** to the specific store page that lists the items you want to buy.
    *   *Example: https://store.play.net/store/purchase/gs*
6.  Go back to the tool (at http://localhost:3000) and click **"Refresh Item List"**.
7.  You should see a list of items.
8.  **Buy**:
    *   **Single Item**: Enter quantity and click **"Buy Now"** to purchase immediately.
    *   **Shopping Cart**:
        1.  Enter quantity and click **"Add to Cart"**.
        2.  Repeat for other items.
        3.  Click the **"Cart"** button at the top to view your items.
        4.  Click **"Checkout All"** to purchase everything in the cart sequentially.
9.  **Stop**: When you are finished, click the red **"Stop Service"** button to shut down the tool safely.

## Features
*   **Sticky Header**: Controls stay visible while scrolling.
*   **Progress Bar**: Real-time tracking of purchase progress.
*   **Shopping Cart**: Queue multiple items and check out in one go.
*   **Type Safety**: Built with TypeScript to reduce bugs and strictly define data structures.

## ⚠️ Important Usage Tips

*   **Do NOT navigate away**: Once you click "Buy" or "Checkout", **do not touch** the automated browser window until it is finished.
    *   The tool needs to stay on the correct page to process each transaction.
    *   If you click a different link or close the tab while it's buying, the remaining purchases will fail.
*   **Let it run**: You can switch back to your other windows (like YouTube or work), but leave the automated Chrome window open and alone in the background.

## Security & Technical Details

This tool is designed with security in mind:

1.  **Runs Locally**: The code runs entirely on your own computer (`localhost`). No data is sent to us or any third party.
2.  **No Credentials Stored**: The tool **never** asks for your username or password. You log in manually on the official website.
3.  **Session Piggybacking**: The tool uses an automation technology called Puppeteer to control the browser. It reuses the valid login session (cookies) established when you logged in manually.
4.  **Open Source**: The code is written in TypeScript. You can verify in `src/automation.ts` and `src/server.ts` that there is no code to extract or transmit your password.

## Troubleshooting

*   **"Browser disconnected"**: If you accidentally close the automated browser window, just click "Launch Browser" again.
*   **"No items found"**: Make sure the automated browser window is on the actual store page with the "Buy" buttons before you click Refresh.
