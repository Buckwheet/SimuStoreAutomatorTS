import express, { Request, Response } from 'express';
import * as automation from './automation';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.static('public')); // Serve frontend files
app.use(express.json());

// Launch browser immediately or on demand? On demand via API is safer.
app.get('/api/launch', async (req: Request, res: Response) => {
    try {
        await automation.launchBrowser();
        res.json({ status: 'Browser launched' });
    } catch (e: any) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get('/api/items', async (req: Request, res: Response) => {
    try {
        const items = await automation.scrapeItems();
        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.toString() });
    }
});

app.post('/api/buy', async (req: Request, res: Response) => {
    const { id, cost, quantity } = req.body;
    if (!id || !cost || !quantity) {
        res.status(400).json({ error: "Missing parameters" });
        return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ error: "Invalid quantity" });
        return;
    }

    // Stream response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
        await automation.purchaseItem(id, cost, qty, (current, total) => {
            // Write progress line
            res.write(JSON.stringify({ current, total, message: `Buying ${current}/${total}...` }) + "\n");
        });
        res.write(JSON.stringify({ status: "complete" }) + "\n");
        res.end();
    } catch (e: any) {
        res.write(JSON.stringify({ error: e.toString() }) + "\n");
        res.end();
    }
});

app.post('/api/buy-cart', async (req: Request, res: Response) => {
    const { cart } = req.body; // Expects array of { id, name, cost, quantity }
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        res.status(400).json({ error: "Empty cart" });
        return;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
        await automation.purchaseCart(cart, (current, total, msg) => {
            res.write(JSON.stringify({ current, total, message: msg }) + "\n");
        });
        res.write(JSON.stringify({ status: "complete" }) + "\n");
        res.end();
    } catch (e: any) {
        res.write(JSON.stringify({ error: e.toString() }) + "\n");
        res.end();
    }
});

app.post('/api/shutdown', (req: Request, res: Response) => {
    res.json({ status: "Shutting down..." });
    console.log("Shutdown requested via UI.");
    // Wait briefly to allow response to send
    setTimeout(() => {
        process.exit(0);
    }, 500);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
