import puppeteer, { type Browser, type Page } from "puppeteer";

// --- Config (overridable via environment variables) ---
const PURCHASE_DELAY_MS = Number(process.env.PURCHASE_DELAY_MS) || 2000;
const STORE_URL =
	process.env.STORE_URL || "https://store.play.net/store/purchase/gs";

// Singleton browser/page — only one automated session at a time
let browser: Browser | null = null;
let page: Page | null = null;

export interface Item {
	id: string;
	name: string;
	cost: number;
	icon: string;
	desc: string;
	subscriberOnly: boolean;
}

export interface CartItem extends Item {
	quantity: number;
}

type ProgressCallback = (current: number, total: number, msg: string) => void;

/**
 * Launch a headed Chrome window and navigate to the store.
 * If the browser is already open and connected, this is a no-op.
 * If it was disconnected (user closed it), re-launches.
 */
export async function launchBrowser(): Promise<void> {
	console.log("Launching browser...");
	if (browser) {
		if (browser.isConnected()) {
			console.log("Browser already connected.");
			return;
		}
		console.log("Browser disconnected. Re-launching...");
		browser = null;
		page = null;
	}

	browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		args: ["--start-maximized"],
	});

	// Auto-clear refs if the user closes the browser window manually
	browser.on("disconnected", () => {
		console.log("Browser disconnected.");
		browser = null;
		page = null;
	});

	page = await browser.newPage();
	try {
		await page.goto(STORE_URL, { waitUntil: "networkidle2" });
	} catch (e) {
		console.error("Navigation error:", e);
	}
	console.log("Browser launched successfully.");
}

/** Close the browser if it's open. Safe to call multiple times. */
export async function closeBrowser(): Promise<void> {
	if (browser) {
		try {
			await browser.close();
		} catch (_) {
			// already closed
		}
		browser = null;
		page = null;
	}
}

/**
 * Scrape purchasable items from the current store page.
 * Runs inside the browser context via page.evaluate().
 * Looks for .general_item_wrapper elements with an ID, name link, and price span.
 */
export async function scrapeItems(): Promise<Item[]> {
	if (!page) throw new Error("Browser not launched");

	return await page.evaluate(() => {
		const items: Item[] = [];
		for (const div of document.querySelectorAll(".general_item_wrapper")) {
			const idParts = div.id.split("_");
			if (idParts.length < 2) continue;
			const id = idParts[1];

			const nameEl = div.querySelector(
				".normal_item_name a",
			) as HTMLElement | null;
			const name = nameEl ? nameEl.innerText.trim() : "Unknown Item";

			const costEl = div.querySelector(
				".item_price .blue span",
			) as HTMLElement | null;
			const cost = costEl
				? Number.parseInt(costEl.innerText.replace(/,/g, ""), 10)
				: 0;

			const iconEl = div.querySelector(
				".item_icon img",
			) as HTMLImageElement | null;
			const icon = iconEl ? iconEl.src : "";

			const limitedEl = div.querySelector(".limited_available");
			let desc = "";
			if (limitedEl) {
				const nodes = limitedEl.childNodes;
				const last = nodes[nodes.length - 1];
				if (last && last.nodeType === 3) desc = last.textContent?.trim() || "";
			}

			const subscriberOnly = !!div.querySelector(".restricted_available");

			items.push({ id, name, cost, icon, desc, subscriberOnly });
		}
		return items;
	});
}

/**
 * Execute a single purchase by replaying the store's own POST endpoint.
 * Runs inside the browser context so it uses the user's authenticated session cookies.
 * Returns { ok, detail } — checks both HTTP status and response body for failure indicators.
 */
async function executePurchase(
	p: Page,
	itemId: string,
	cost: number,
): Promise<{ ok: boolean; detail: string }> {
	return await p.evaluate(
		async (id: string, costVal: number) => {
			try {
				const response = await fetch(
					`https://store.play.net/store/PurchaseItemConfirmed?id=${id}&qty=1&confirmation_item=yes&cost=${costVal}`,
					{
						headers: {
							accept: "*/*",
							"x-requested-with": "XMLHttpRequest",
						},
						referrer: `https://store.play.net/store/purchaseitem/${id}`,
						referrerPolicy: "strict-origin-when-cross-origin",
						body: null,
						method: "POST",
						mode: "cors",
						credentials: "include",
					},
				);
				const body = await response.text();
				if (!response.ok) {
					return {
						ok: false,
						detail: `HTTP ${response.status}: ${body.slice(0, 200)}`,
					};
				}
				// Check for known failure strings in the response body
				const lower = body.toLowerCase();
				if (
					lower.includes("insufficient") ||
					lower.includes("unable to purchase") ||
					lower.includes("error")
				) {
					return { ok: false, detail: body.slice(0, 200) };
				}
				return { ok: true, detail: "success" };
			} catch (e) {
				return { ok: false, detail: String(e) };
			}
		},
		itemId,
		cost,
	);
}

async function delay(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Purchase a single item N times with a delay between each request.
 * Calls onProgress after each attempt so the server can stream updates to the UI.
 */
export async function purchaseItem(
	itemId: string,
	cost: number,
	quantity: number,
	onProgress?: ProgressCallback,
): Promise<{ status: string }> {
	if (!page) throw new Error("Browser not launched");

	console.log(`Purchasing Item ${itemId} x${quantity} @ ${cost} SC each`);

	for (let i = 0; i < quantity; i++) {
		const result = await executePurchase(page, itemId, cost);
		const label = `Purchase ${i + 1}/${quantity}`;

		if (result.ok) {
			console.log(`${label} succeeded.`);
		} else {
			console.error(`${label} failed: ${result.detail}`);
		}

		const msg = result.ok
			? `Bought ${i + 1}/${quantity}`
			: `Failed ${i + 1}/${quantity}: ${result.detail}`;
		onProgress?.(i + 1, quantity, msg);

		if (i < quantity - 1) await delay(PURCHASE_DELAY_MS);
	}

	return { status: "complete" };
}

/**
 * Purchase all items in a cart sequentially.
 * Flattens the cart into individual purchases and tracks overall progress across all items.
 */
export async function purchaseCart(
	cartItems: CartItem[],
	onProgress?: ProgressCallback,
): Promise<{ status: string }> {
	if (!page) throw new Error("Browser not launched");

	const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
	let current = 0;

	for (const item of cartItems) {
		for (let i = 0; i < item.quantity; i++) {
			current++;
			const result = await executePurchase(page, item.id, item.cost);
			const label = `${item.name || item.id} (${i + 1}/${item.quantity})`;

			if (!result.ok) console.error(`Failed: ${label} — ${result.detail}`);

			const msg = result.ok
				? `Bought ${label}`
				: `Failed ${label}: ${result.detail}`;
			onProgress?.(current, totalItems, msg);

			if (current < totalItems) await delay(PURCHASE_DELAY_MS);
		}
	}

	return { status: "complete" };
}
