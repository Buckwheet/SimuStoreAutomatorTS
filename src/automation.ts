import puppeteer, { type Browser, type Page } from "puppeteer";

const PURCHASE_DELAY_MS = Number(process.env.PURCHASE_DELAY_MS) || 2000;
const STORE_URL =
	process.env.STORE_URL || "https://store.play.net/store/purchase/gs";

let browser: Browser | null = null;
let page: Page | null = null;

export interface Item {
	id: string;
	name: string;
	cost: number;
}

export interface CartItem extends Item {
	quantity: number;
}

type ProgressCallback = (current: number, total: number, msg: string) => void;

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

			items.push({ id, name, cost });
		}
		return items;
	});
}

// --- Shared purchase execution ---

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
				// Check for known failure indicators in the response
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
