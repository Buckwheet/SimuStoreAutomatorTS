import crypto from "node:crypto";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import * as automation from "./automation";

// --- Config ---
const PORT = Number(process.env.PORT) || 3000;
const AUTH_TOKEN = crypto.randomBytes(32).toString("hex");

const app = express();

// Serve frontend files, but inject the auth token into index.html
app.get("/", (_req: Request, res: Response) => {
	const path = require("node:path");
	const fs = require("node:fs");
	const html = fs.readFileSync(
		path.join(__dirname, "..", "public", "index.html"),
		"utf-8",
	);
	// Inject token as a global variable before </head>
	const injected = html.replace(
		"</head>",
		`<script>window.__AUTH_TOKEN="${AUTH_TOKEN}";</script></head>`,
	);
	res.type("html").send(injected);
});

// Serve other static assets normally
app.use(express.static("public"));
app.use(express.json());

// --- Auth middleware for /api routes ---
function requireAuth(req: Request, res: Response, next: NextFunction): void {
	const token = req.headers["x-auth-token"] || req.query.token;
	if (token !== AUTH_TOKEN) {
		res.status(403).json({ error: "Forbidden" });
		return;
	}
	next();
}

app.use("/api", requireAuth);

// --- Concurrency lock ---
let purchaseInProgress = false;

// --- API Routes ---

app.get("/api/launch", async (_req: Request, res: Response) => {
	try {
		await automation.launchBrowser();
		res.json({ status: "Browser launched" });
	} catch (e) {
		res.status(500).json({ error: String(e) });
	}
});

app.get("/api/items", async (_req: Request, res: Response) => {
	try {
		const items = await automation.scrapeItems();
		res.json(items);
	} catch (e) {
		res.status(500).json({ error: String(e) });
	}
});

function streamPurchase(res: Response, purchaseFn: () => Promise<void>): void {
	if (purchaseInProgress) {
		res.status(409).json({ error: "A purchase is already in progress" });
		return;
	}
	purchaseInProgress = true;

	res.setHeader("Content-Type", "text/plain");

	purchaseFn()
		.then(() => {
			res.write(`${JSON.stringify({ status: "complete" })}\n`);
		})
		.catch((e) => {
			res.write(`${JSON.stringify({ error: String(e) })}\n`);
		})
		.finally(() => {
			purchaseInProgress = false;
			res.end();
		});
}

app.post("/api/buy", (req: Request, res: Response) => {
	const { id, cost, quantity } = req.body;
	if (!id || !cost || !quantity) {
		res.status(400).json({ error: "Missing parameters" });
		return;
	}

	const qty = Number.parseInt(quantity, 10);
	if (Number.isNaN(qty) || qty <= 0) {
		res.status(400).json({ error: "Invalid quantity" });
		return;
	}

	streamPurchase(res, async () => {
		await automation.purchaseItem(id, cost, qty, (current, total, msg) => {
			res.write(`${JSON.stringify({ current, total, message: msg })}\n`);
		});
	});
});

app.post("/api/buy-cart", (req: Request, res: Response) => {
	const { cart } = req.body;
	if (!cart || !Array.isArray(cart) || cart.length === 0) {
		res.status(400).json({ error: "Empty cart" });
		return;
	}

	streamPurchase(res, async () => {
		await automation.purchaseCart(cart, (current, total, msg) => {
			res.write(`${JSON.stringify({ current, total, message: msg })}\n`);
		});
	});
});

app.post("/api/shutdown", (_req: Request, res: Response) => {
	res.json({ status: "Shutting down..." });
	console.log("Shutdown requested via UI.");
	gracefulShutdown();
});

// --- Graceful shutdown ---
async function gracefulShutdown(): Promise<void> {
	console.log("Shutting down gracefully...");
	try {
		await automation.closeBrowser();
	} catch (e) {
		console.error("Error closing browser:", e);
	}
	if (server) {
		server.close(() => {
			console.log("HTTP server closed.");
			process.exit(0);
		});
		// Force exit after 5s if connections don't drain
		setTimeout(() => process.exit(0), 5000);
	} else {
		process.exit(0);
	}
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

const server = app.listen(PORT, "127.0.0.1", () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log(`Auth token: ${AUTH_TOKEN}`);
});
