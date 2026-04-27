(() => {
	if (document.getElementById("ssa-panel")) return;

	const DELAY_MS = 2000;
	let cart = [];
	let purchasing = false;

	// --- Scrape items from the page ---
	function scrapeItems() {
		const items = [];
		for (const div of document.querySelectorAll(".general_item_wrapper")) {
			const parts = div.id.split("_");
			if (parts.length < 2) continue;
			const id = parts[1];
			const nameEl = div.querySelector(".normal_item_name a");
			const name = nameEl ? nameEl.innerText.trim() : "Unknown Item";
			const costEl = div.querySelector(".item_price .blue span");
			const cost = costEl
				? parseInt(costEl.innerText.replace(/,/g, ""), 10)
				: 0;
			items.push({ id, name, cost });
		}
		return items;
	}

	// --- Purchase one item via the store's own endpoint ---
	async function executePurchase(id, cost) {
		try {
			const res = await fetch(
				`https://store.play.net/store/PurchaseItemConfirmed?id=${id}&qty=1&confirmation_item=yes&cost=${cost}`,
				{
					method: "POST",
					headers: { accept: "*/*", "x-requested-with": "XMLHttpRequest" },
					referrer: `https://store.play.net/store/purchaseitem/${id}`,
					referrerPolicy: "strict-origin-when-cross-origin",
					credentials: "include",
				},
			);
			const body = await res.text();
			if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
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
	}

	function delay(ms) {
		return new Promise((r) => setTimeout(r, ms));
	}

	// --- Build the UI panel ---
	const panel = document.createElement("div");
	panel.id = "ssa-panel";
	panel.innerHTML = `
    <div class="ssa-header">
      <span>SimuStore Automator</span>
      <div>
        <button id="ssa-collapse" title="Collapse">−</button>
      </div>
    </div>
    <div class="ssa-body">
      <div class="ssa-status" id="ssa-status">Click Refresh to load items.</div>
      <div class="ssa-progress" id="ssa-progress">
        <div class="ssa-progress-bar" id="ssa-bar">0%</div>
      </div>
      <div class="ssa-tabs">
        <button class="ssa-tab active" data-tab="items">Items</button>
        <button class="ssa-tab" data-tab="cart">Cart (0)</button>
      </div>
      <div id="ssa-tab-items">
        <button class="ssa-btn ssa-btn-go" id="ssa-refresh" style="width:100%;margin-bottom:8px;">Refresh Items</button>
        <ul class="ssa-items" id="ssa-list"></ul>
      </div>
      <div id="ssa-tab-cart" style="display:none;">
        <div id="ssa-cart-list"></div>
        <div class="ssa-cart-total" id="ssa-cart-total">Total: 0 SC</div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button class="ssa-btn ssa-btn-clear" id="ssa-clear-cart" style="flex:1;">Clear</button>
          <button class="ssa-btn ssa-btn-buy" id="ssa-checkout" style="flex:1;">Buy All</button>
        </div>
      </div>
    </div>`;
	document.body.appendChild(panel);

	// Element refs
	const statusEl = document.getElementById("ssa-status");
	const progressEl = document.getElementById("ssa-progress");
	const barEl = document.getElementById("ssa-bar");
	const listEl = document.getElementById("ssa-list");
	const cartListEl = document.getElementById("ssa-cart-list");
	const cartTotalEl = document.getElementById("ssa-cart-total");
	const cartTab = panel.querySelector('[data-tab="cart"]');
	const _itemsTab = panel.querySelector('[data-tab="items"]');
	const tabItems = document.getElementById("ssa-tab-items");
	const tabCart = document.getElementById("ssa-tab-cart");

	// --- Tabs ---
	for (const tab of panel.querySelectorAll(".ssa-tab")) {
		tab.addEventListener("click", () => {
			for (const t of panel.querySelectorAll(".ssa-tab"))
				t.classList.remove("active");
			tab.classList.add("active");
			tabItems.style.display = tab.dataset.tab === "items" ? "" : "none";
			tabCart.style.display = tab.dataset.tab === "cart" ? "" : "none";
			if (tab.dataset.tab === "cart") renderCart();
		});
	}

	// --- Collapse ---
	document.getElementById("ssa-collapse").addEventListener("click", () => {
		panel.classList.toggle("collapsed");
	});

	// --- Refresh ---
	document.getElementById("ssa-refresh").addEventListener("click", () => {
		const items = scrapeItems();
		listEl.innerHTML = "";
		if (items.length === 0) {
			statusEl.textContent = "No items found. Navigate to a store page.";
			return;
		}
		for (const item of items) {
			const li = document.createElement("li");

			const nameSpan = document.createElement("span");
			nameSpan.className = "ssa-item-name";
			nameSpan.textContent = item.name;
			nameSpan.title = item.name;

			const costSpan = document.createElement("span");
			costSpan.className = "ssa-item-cost";
			costSpan.textContent = `${item.cost.toLocaleString()} SC`;

			const qty = document.createElement("input");
			qty.type = "number";
			qty.value = "1";
			qty.min = "1";

			const cartBtn = document.createElement("button");
			cartBtn.className = "ssa-btn ssa-btn-cart";
			cartBtn.textContent = "+Cart";
			cartBtn.addEventListener("click", () => {
				const q = parseInt(qty.value, 10) || 1;
				const existing = cart.find((c) => c.id === item.id);
				if (existing) existing.quantity += q;
				else cart.push({ ...item, quantity: q });
				updateCartCount();
				statusEl.textContent = `Added ${q}x ${item.name} to cart.`;
			});

			const buyBtn = document.createElement("button");
			buyBtn.className = "ssa-btn ssa-btn-buy";
			buyBtn.textContent = "Buy";
			buyBtn.addEventListener("click", async () => {
				const q = parseInt(qty.value, 10) || 1;
				if (
					!confirm(
						`Buy ${q}x ${item.name} for ${(item.cost * q).toLocaleString()} SC?`,
					)
				)
					return;
				await runPurchase([{ ...item, quantity: q }]);
			});

			li.append(nameSpan, costSpan, qty, cartBtn, buyBtn);
			listEl.appendChild(li);
		}
		statusEl.textContent = `Found ${items.length} items.`;
	});

	// --- Cart ---
	function updateCartCount() {
		const total = cart.reduce((s, i) => s + i.quantity, 0);
		cartTab.textContent = `Cart (${total})`;
	}

	function renderCart() {
		cartListEl.innerHTML = "";
		if (cart.length === 0) {
			cartListEl.innerHTML =
				'<p style="text-align:center;color:#777;">Cart is empty.</p>';
			cartTotalEl.textContent = "Total: 0 SC";
			return;
		}
		let total = 0;
		cart.forEach((item, i) => {
			const sub = item.cost * item.quantity;
			total += sub;
			const div = document.createElement("div");
			div.className = "ssa-cart-item";

			const info = document.createElement("span");
			info.textContent = `${item.name} — ${item.cost} SC × ${item.quantity}`;

			const rm = document.createElement("button");
			rm.className = "ssa-btn ssa-btn-clear";
			rm.textContent = "✕";
			rm.addEventListener("click", () => {
				cart.splice(i, 1);
				updateCartCount();
				renderCart();
			});

			div.append(info, rm);
			cartListEl.appendChild(div);
		});
		cartTotalEl.textContent = `Total: ${total.toLocaleString()} SC`;
	}

	document.getElementById("ssa-clear-cart").addEventListener("click", () => {
		if (cart.length && confirm("Clear cart?")) {
			cart = [];
			updateCartCount();
			renderCart();
		}
	});

	document
		.getElementById("ssa-checkout")
		.addEventListener("click", async () => {
			if (!cart.length) return;
			if (
				!confirm(
					`Buy all ${cart.reduce((s, i) => s + i.quantity, 0)} items for ${cart.reduce((s, i) => s + i.cost * i.quantity, 0).toLocaleString()} SC?`,
				)
			)
				return;
			const snapshot = [...cart];
			cart = [];
			updateCartCount();
			renderCart();
			await runPurchase(snapshot);
		});

	// --- Purchase runner ---
	async function runPurchase(items) {
		if (purchasing) {
			statusEl.textContent = "A purchase is already running.";
			return;
		}
		purchasing = true;
		const totalQty = items.reduce((s, i) => s + i.quantity, 0);
		let current = 0;

		progressEl.style.display = "";
		barEl.style.width = "0%";
		barEl.textContent = "0%";
		barEl.style.background = "#28a745";
		setButtons(true);

		for (const item of items) {
			for (let i = 0; i < item.quantity; i++) {
				current++;
				statusEl.textContent = `Buying ${item.name} (${i + 1}/${item.quantity})…`;
				const result = await executePurchase(item.id, item.cost);
				if (!result.ok) {
					statusEl.textContent = `Failed: ${item.name} — ${result.detail}`;
					barEl.style.background = "#dc3545";
				}
				const pct = Math.round((current / totalQty) * 100);
				barEl.style.width = `${pct}%`;
				barEl.textContent = `${pct}%`;
				if (current < totalQty) await delay(DELAY_MS);
			}
		}

		statusEl.textContent = `Done! Purchased ${totalQty} item(s).`;
		barEl.style.width = "100%";
		barEl.textContent = "Done!";
		purchasing = false;
		setButtons(false);
	}

	function setButtons(disabled) {
		for (const btn of panel.querySelectorAll(
			".ssa-btn-buy, .ssa-btn-go, #ssa-checkout",
		)) {
			btn.disabled = disabled;
		}
	}

	// --- Draggable header ---
	let dragging = false,
		dx = 0,
		dy = 0;
	const header = panel.querySelector(".ssa-header");
	header.addEventListener("mousedown", (e) => {
		if (e.target.tagName === "BUTTON") return;
		dragging = true;
		const rect = panel.getBoundingClientRect();
		dx = e.clientX - rect.left;
		dy = e.clientY - rect.top;
	});
	document.addEventListener("mousemove", (e) => {
		if (!dragging) return;
		panel.style.left = `${e.clientX - dx}px`;
		panel.style.top = `${e.clientY - dy}px`;
		panel.style.right = "auto";
	});
	document.addEventListener("mouseup", () => {
		dragging = false;
	});
})();
