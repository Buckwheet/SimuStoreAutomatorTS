import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const src = readFileSync("chrome-extension/content.js", "utf8");

const FIXTURE_HTML = `
  <div class="general_item_wrapper" id="item_101">
    <div class="normal_item_name"><a>Glimmering Sword</a></div>
    <div class="item_price"><div class="blue"><span>1,250</span></div></div>
    <div class="item_icon"><img src="https://store.play.net/img/sword.png"></div>
    <div class="limited_available">Limited offer<span> ends soon</span> last chance</div>
  </div>
  <div class="general_item_wrapper" id="item_202">
    <div class="normal_item_name"><a>Dragon Amulet</a></div>
    <div class="item_price"><div class="blue"><span>500</span></div></div>
    <div class="item_icon"><img src="https://store.play.net/img/amulet.png"></div>
    <div class="restricted_available">Subscribers only</div>
  </div>
`;

const dom = new JSDOM(
	`<!doctype html><html><body>${FIXTURE_HTML}</body></html>`,
	{
		runScripts: "dangerously",
	},
);
const win = dom.window;
// jsdom does not implement innerText; map it to textContent (identical for the
// plain-text elements content.js reads). Test-only shim, production untouched.
Object.defineProperty(win.HTMLElement.prototype, "innerText", {
	configurable: true,
	get() {
		return this.textContent;
	},
});
// Run the real IIFE in the jsdom realm and grab the exported API.
const SSA = new win.Function(`${src}\n;return window.SSA;`).call(win);

describe("scrapeItems", () => {
	it("extracts id, name, cost, icon, desc, subscriberOnly from .general_item_wrapper", () => {
		expect(SSA.scrapeItems()).toEqual([
			{
				id: "101",
				name: "Glimmering Sword",
				cost: 1250,
				icon: "https://store.play.net/img/sword.png",
				desc: "last chance",
				subscriberOnly: false,
			},
			{
				id: "202",
				name: "Dragon Amulet",
				cost: 500,
				icon: "https://store.play.net/img/amulet.png",
				desc: "",
				subscriberOnly: true,
			},
		]);
	});
});

describe("validatePurchaseResponse", () => {
	it("flags insufficient funds", () => {
		expect(SSA.validatePurchaseResponse(200, "insufficient funds")).toEqual({
			ok: false,
			detail: "insufficient funds",
		});
	});
	it("accepts clean success", () => {
		expect(SSA.validatePurchaseResponse(200, "<html>success</html>")).toEqual({
			ok: true,
			detail: "success",
		});
	});
	it("flags HTTP errors with the status code", () => {
		expect(SSA.validatePurchaseResponse(500, "")).toEqual({
			ok: false,
			detail: "HTTP 500",
		});
	});
});

describe("panel", () => {
	it("injects the #ssa-panel element into the page", () => {
		expect(win.document.getElementById("ssa-panel")).not.toBeNull();
	});
	it("renders a Support footer link to the GitHub Sponsors page", () => {
		const link = win.document.querySelector("#ssa-footer a");
		expect(link).not.toBeNull();
		expect(link.href).toBe("https://github.com/sponsors/Buckwheet");
	});
});
