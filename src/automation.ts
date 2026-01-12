import puppeteer, { type Browser, type Page } from "puppeteer";

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

export async function launchBrowser(): Promise<void> {
	console.log("Launching browser...");
	if (browser) {
		console.log("Browser already instance exists.");
		if (browser.isConnected()) {
			console.log("Browser is connected.");
			return;
		}
		console.log("Browser instance found but disconnected. Re-launching...");
		browser = null;
	}

	try {
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
			await page.goto("https://store.play.net/store/purchase/gs", {
				waitUntil: "networkidle2",
			});
		} catch (e) {
			console.error("Navigation error:", e);
		}
		console.log("Browser launched successfully.");
	} catch (e) {
		console.error("Failed to launch browser:", e);
		throw e;
	}
}

export async function scrapeItems(): Promise<Item[]> {
	if (!page) throw new Error("Browser not launched");

	// Evaluate script in browser context to get items
	return await page.evaluate(() => {
		const items: Item[] = [];
		const wrappers = document.querySelectorAll(".general_item_wrapper");

		wrappers.forEach((div) => {
			const idParts = div.id.split("_");
			if (idParts.length < 2) return;
			const id = idParts[1];

			const nameEl = div.querySelector(".normal_item_name a") as HTMLElement;
			const name = nameEl ? nameEl.innerText.trim() : "Unknown Item";

			const costEl = div.querySelector(".item_price .blue span") as HTMLElement;
			let cost = 0;
			if (costEl) {
				// Remove commas and parse
				cost = parseInt(costEl.innerText.replace(/,/g, ""), 10);
			}

			items.push({ id, name, cost });
		});

		return items;
	});
}

export async function purchaseItem(
	itemId: string,
	cost: number,
	quantity: number,
	onProgress?: (current: number, total: number) => void,
): Promise<{ status: string }> {
	if (!page) throw new Error("Browser not launched");

	console.log(
		`Starting purchase loop for Item ${itemId}, Cost ${cost}, Quantity ${quantity}`,
	);

	for (let i = 0; i < quantity; i++) {
		console.log(`Purchase ${i + 1}/${quantity}...`);

		// Execute the fetch in the browser context to use existing cookies/session
		const success = await page.evaluate(
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
					return response.ok;
				} catch (e) {
					console.error(e);
					return false;
				}
			},
			itemId,
			cost,
		);

		if (success) {
			console.log(`Purchase ${i + 1} successful.`);
		} else {
			console.error(`Purchase ${i + 1} failed.`);
		}

		if (onProgress) onProgress(i + 1, quantity);

		// Wait 2 seconds (user requested)
		if (i < quantity - 1) {
			await new Promise((r) => setTimeout(r, 2000));
		}
	}

	console.log("Purchase loop complete.");
	return { status: "complete" };
}

export async function purchaseCart(
	cartItems: CartItem[],
	onProgress?: (current: number, total: number, msg: string) => void,
): Promise<{ status: string }> {
	if (!page) throw new Error("Browser not launched");

	console.log(`Starting cart purchase for ${cartItems.length} unique items.`);

	let totalItems = 0;
	for (const i of cartItems) {
		totalItems += i.quantity;
	}
	let currentItem = 0;

	for (const item of cartItems) {
		console.log(`Processing Item ${item.id} (${item.quantity}x)...`);

		for (let i = 0; i < item.quantity; i++) {
			currentItem++;
			if (onProgress)
				onProgress(
					currentItem,
					totalItems,
					`Buying ${item.name || item.id} (${i + 1}/${item.quantity})`,
				);

			const success = await page.evaluate(
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
						return response.ok;
					} catch (e) {
						console.error(e);
						return false;
					}
				},
				item.id,
				item.cost,
			);

			if (!success) console.error(`Failed to buy ${item.id}`);

			// Wait 2 seconds between every purchase
			if (currentItem < totalItems)
				await new Promise((r) => setTimeout(r, 2000));
		}
	}

	return { status: "complete" };
}
