# SimuStore Automator — Official Release & Monetization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the content-script extension from a GitHub-only Chrome extension to published listings on Chrome Web Store, Edge Add-ons, and Firefox AMO, with a donation (GitHub Sponsors) funding path — no paid features, no ads.

**Architecture (current, verified):** `chrome-extension/` is a self-contained MV3 content script (`content.js` 434 lines, IIFE) that injects a floating panel on `store.play.net/store/purchase/*`, scrapes items from `.general_item_wrapper` DOM, and replays the store's own `PurchaseItemConfirmed` POST with `credentials: include` (same-origin, no CORS issue). Zero `chrome.*`/`browser.*` API usage, zero permissions beyond `host_permissions: ["https://store.play.net/*"]`, no background worker, no storage, no remote code. The `src/` Puppeteer server is a separate power-user path — NOT part of store listings.

**Tech Stack (extension):** Plain JS + CSS, Manifest V3, Biome (lint), vitest + jsdom (tests, to add), web-ext (Firefox lint), GitHub Actions (CI). Store listings: CWS, Edge Add-ons, AMO.

## Part A — Move-Forward Strategy

### A1. Go / no-go

GO. Reasons: zero-permission surface (fast store review), no browser-API code to port, active user (the author uses it), free store registration except CWS's one-time $5. The only real risks (A4) are mitigable with copy and a disclaimer.

### A2. Target matrix

| Target | Effort | Cost | Notes |
|---|---|---|---|
| Chrome Web Store | Low | $5 one-time | Primary listing; also covers Brave + Opera (Opera accepts the same ZIP via its own portal, free) |
| Edge Add-ons | Low | $0 | Can import the Chrome listing; separate review queue |
| Firefox AMO | Low | $0 | Needs `browser_specific_settings.gecko.id` in manifest + `web-ext lint` pass |
| Safari | HIGH | $99/yr + macOS + Xcode | Not worth it for a GSIV niche. **Defer indefinitely** — revisit only if Mac users ask |
| Self-distribution (GitHub Releases .zip) | Trivial | $0 | Keep forever: source-verifiable installs, no store dependency |

### A3. What the stores will review

- CWS/Edge: honest description, screenshots, no data collection (→ no privacy policy required; state "collects no data" in the privacy practices form), single purpose, no obfuscation. The extension replays the user's own purchase requests on the user's own logged-in session — user-initiated, not deceptive. Automation extensions pass review routinely.
- AMO: same, plus source-link requirement (GitHub repo satisfies it) and a passing `web-ext lint`.

### A4. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Simutronics ToS: automation may be prohibited → account actions | MED (user-side) | Keep the existing Disclaimer in README + listing description: "not affiliated with Simutronics, use at your own risk, keep quantities reasonable" |
| Trademark: "SimuStore"/"SimuCoins" are Simutronics marks in listing name | LOW | Name is descriptive of the target page. Keep "SimuStore Automator" unless a store objects; if so, rename to "Bulk Buyer for SimuCoins Store" (one manifest field) |
| Store review rejection | LOW | Zero-permission design + no-data-collection + honest copy. Fix-and-resubmit is normal |
| Purchase endpoint changes (store DOM/API drift) | MED (ops) | Extension scrapes selectors + hits one endpoint; pin them in one test file so breakage is caught by CI before users see it (Task 1) |

### A5. Monetization — donations only

Decisions (locked):
- **No paid extension, no in-extension ads, no premium gating.** CWS/Edge/AMO all forbid paid extensions; gating features invites store + ToS scrutiny. Donations are the considered option.
- **Vehicle: GitHub Sponsors** (zero platform fee, user already operates as GitHub "Buckwheet"). Add `.github/FUNDING.yml` → GitHub auto-shows the Sponsor button on the repo.
- **Placement of the ask (exactly 3, no more):**
  1. Sponsors button via FUNDING.yml (repo page)
  2. README badge (shields.io sponsors badge) under a "Support" heading
  3. Small "♥ Support" link in the extension panel footer (Task 6, ~5 lines)
- **Explicitly NOT doing:** Ko-fi/BuyMeACoffee (5% fees; Sponsors covers it), a landing page (no traffic yet — add a Cloudflare Pages site only if downloads justify it; if built, harden with the cloudflare-workers-apps skill), license servers, crypto donations, "premium features" (YAGNI + policy risk).
- Donations are personal income via GitHub Sponsors payout (Stripe). If they ever become significant, revisit routing through the Talaria business structure — not now.

### A6. Conventions (from the MattsFutureCompany playbook, adapted)

- Gate = lint + tests + pre-commit hook: `biome check` + `vitest run` via husky.
- Every code task: branch → implement → test → lint → commit → PR → review (requesting-code-review skill) → merge → verify.
- Review skills to use during execution: `code-review` (before/after each task), `web-app-security-review` (Task 5), `cloudflare-workers-apps` (only if the landing page ever gets built).
- Verification before claiming done: `verification-before-completion` skill; manual load-in-browser check per store target.

## Part B — Development Plan

## Global Constraints

- Extension stays a **single content script + CSS + manifest** — no build step for the extension itself, no bundler. (The TS server keeps its own `tsc` build untouched.)
- No new runtime dependencies. Dev-only additions: `vitest`, `jsdom`, `web-ext`.
- Manifest remains MV3; `permissions: []` stays empty forever. If a feature needs a permission, question the feature.
- Biome formatting rules apply to all JS/CSS/JSON. Line endings LF (repo currently CRLF in some files — biome will normalize; do it once in Task 0).
- All user-facing copy keeps the "not affiliated / at your own risk" disclaimer.
- Node 18+.

---

### Task 0: Baseline hygiene

**Files:**
- Modify: `.gitignore`, `.husky/pre-commit`
- Run: `npx biome check --write .` (normalizes CRLF→LF, formats everything)

- [ ] **Step 1:** `git status` clean check, then `npx biome check .` to see current violations.
- [ ] **Step 2:** Run `npx biome check --write .` and commit the formatting normalization separately: `git commit -m "chore: biome format normalization"`.
- [ ] **Step 3:** Verify `.gitignore` covers `node_modules/`, `dist/`, `.env` (add `dist-ext/` for Task 3 output). Commit.

### Task 1: Test harness (vitest + jsdom) + content.js refactor for testability

The IIFE closure hides the logic. Minimal refactor: keep the IIFE, but expose the two pure-ish functions on `window.__SSA_TEST__` only when a flag is set — actually simpler: attach them unconditionally to a namespace object on `window` (harmless, one line, also gives power users a console hook):

**Files:**
- Modify: `chrome-extension/content.js` (lines 9-34 `scrapeItems`, lines 37-63 `executePurchase`/response check)
- Create: `test/content.test.js`, `test/dom-stub.js` (minimal store-page DOM fixture)
- Modify: `package.json` (add `"test": "vitest run"`, devDeps `vitest`, `jsdom`), `vitest.config.js` (environment: jsdom, no globals needed)
- Modify: `.husky/pre-commit` (add `npx vitest run`)

- [ ] **Step 1:** Write the failing test. Expose logic:
  - In `content.js`, change `function scrapeItems()` → `window.SSA = { scrapeItems, validatePurchaseResponse };` (validatePurchaseResponse is the body of lines 49-59 extracted to a pure function taking `(status, body)`). Everything else stays in the IIFE closure.
  - `test/dom-stub.js` builds a minimal `document` fixture with two `.general_item_wrapper` divs (one with a `.limited_available` trailing text node, one `.restricted_available`).
  - `test/content.test.js`:
    ```js
    import { describe, it, expect } from "vitest";
    import { readFileSync } from "node:fs";
    import { JSDOM } from "jsdom";

    const src = readFileSync(new URL("../chrome-extension/content.js", import.meta.url), "utf8");
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const win = dom.window;
    // stub: content.js calls document.getElementById("ssa-panel") etc. — provide minimal stubs
    const script = new win.Function(src + "\n;return window.SSA;");
    const SSA = script.call(win);

    describe("scrapeItems", () => {
      it("extracts id, name, cost from .general_item_wrapper", () => { /* ...assert 2 items... */ });
      it("parses comma-formatted costs", () => { /* "1,250" -> 1250 */ });
    });
    describe("validatePurchaseResponse", () => {
      it("flags insufficient funds", () => { expect(SSA.validatePurchaseResponse(200, "insufficient funds")).toEqual({ ok: false }); });
      it("accepts clean success", () => { expect(SSA.validatePurchaseResponse(200, "<html>success</html>")).toEqual({ ok: true }); });
    });
    ```
    (Fill the DOM fixture and full assertions in the step; the failure mode being tested: selector drift breaks scraping, response-flag drift breaks purchase detection — both caught by CI.)
- [ ] **Step 2:** Run `npx vitest run` → expect FAIL (functions undefined).
- [ ] **Step 3:** Implement: extract `validatePurchaseResponse`, add the `window.SSA` export line, wire `executePurchase` to use the extracted function.
- [ ] **Step 4:** Run `npx vitest run` → PASS.
- [ ] **Step 5:** Update `.husky/pre-commit` to run `npx biome check . && npx vitest run`. Commit: `git commit -m "test: content script scraping + response validation"`.

### Task 2: Firefox compatibility

**Files:**
- Modify: `chrome-extension/manifest.json`
- Modify: `package.json` (devDep `web-ext`)

- [ ] **Step 1:** Add to `manifest.json`:
  ```json
  "browser_specific_settings": {
    "gecko": {
      "id": "simustore-automator@buckwheet.github.io",
      "strict_min_version": "109.0"
    }
  }
  ```
- [ ] **Step 2:** `npm i -D web-ext`, then `npx web-ext lint --source-dir chrome-extension --ignore-files content.css` (CSS sometimes trips web-ext; keep the ignore only if it complains about a legit CSS feature — otherwise drop it). Fix any errors it reports.
- [ ] **Step 3:** Manual check: load unpacked in Firefox (`about:debugging` → This Firefox → Load Temporary Add-on → select `chrome-extension/manifest.json`), open the store page, confirm panel renders. (Requires a store page; if unavailable, verify at least that the manifest loads without errors and panel code executes — `console.log` in content.js on the store page.)
- [ ] **Step 4:** Commit: `git commit -m "feat: firefox manifest support (gecko id)"`.

### Task 3: Packaging script (one build, all stores)

**Files:**
- Create: `scripts/build-extensions.mjs`
- Modify: `package.json` (script `"build:ext": "node scripts/build-extensions.mjs"`)
- Modify: `.gitignore` (add `dist-ext/`)

- [ ] **Step 1:** Write the script (~35 lines, node stdlib only — no archiver dep; use `zip` command? No: pure-node `child_process` + `tar`? Simplest cross-platform: use `node:zlib`? ZIP needs deflate+central directory — that's real code. **Decision: use the `zip` binary if present, else fall back to PowerShell `Compress-Archive`** — actually cleanest: `npm i -D archiver` is one dep but ponytail rule says stdlib first. On Windows git-bash `zip` exists in MSYS; CI runners have `zip` too. Script:
  ```js
  import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
  import { execSync } from "node:child_process";
  import { readFileSync } from "node:fs";
  const v = JSON.parse(readFileSync("chrome-extension/manifest.json", "utf8")).version;
  const out = "dist-ext";
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const [name, extraManifest] of [
    ["chrome", null],
    ["edge", null],           // same artifact as chrome
    ["firefox", { browser_specific_settings: { gecko: { id: "simustore-automator@buckwheet.github.io", strict_min_version: "109.0" } } }],
  ]) {
    const dir = `${out}/${name}`;
    cpSync("chrome-extension", dir, { recursive: true });
    if (extraManifest) {
      const m = { ...JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8")), ...extraManifest };
      // writeFileSync merged manifest
    }
    execSync(`cd ${dir} && zip -qr ../${name}-${v}.zip .`, { shell: process.platform === "win32" ? "cmd" : "/bin/sh" });
  }
  ```
  (Fill exact writeFileSync call; outputs `dist-ext/chrome-1.0.0.zip`, `dist-ext/edge-1.0.0.zip`, `dist-ext/firefox-1.0.0.zip`.)
- [ ] **Step 2:** Run `npm run build:ext`, verify three zips exist and `unzip -l` shows manifest.json + content.js + icons.
- [ ] **Step 3:** Commit: `git commit -m "feat: multi-store packaging script"`.

### Task 4: CI (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1:** Write the workflow:
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    check:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20, cache: npm }
        - run: npm ci
        - run: npx biome check .
        - run: npx vitest run
        - run: npx web-ext lint --source-dir chrome-extension
        - run: npm run build:ext
        - uses: actions/upload-artifact@v4
          with: { name: extensions, path: dist-ext/*.zip }
  ```
- [ ] **Step 2:** Push branch, confirm the workflow is green on the PR (zip artifacts downloadable for store uploads).
- [ ] **Step 3:** Commit: `git commit -m "ci: lint, test, web-ext lint, package"`.

### Task 5: Security review pass

**Files:**
- Create: `SECURITY.md`
- Modify: none expected (findings → fix if any)

- [ ] **Step 1:** Run the `web-app-security-review` skill checklist against `chrome-extension/` and (for completeness) `src/` + `public/`. Known-good items to verify, not re-litigate: `permissions: []`, host_permissions scoped to `store.play.net` only, panel HTML is a static string (no user data flows into `innerHTML` — item name/cost are set via `textContent`/`createElement`, verified in code), purchase response errors shown as text only, server binds 127.0.0.1 with a per-boot 256-bit token.
- [ ] **Step 2:** Fix anything the review surfaces (expected: none or cosmetic).
- [ ] **Step 3:** Write `SECURITY.md` (3 lines: zero data collection, permissions rationale, where to report issues — GitHub issues). Commit: `git commit -m "docs: security statement"`.

### Task 6: Donation integration

**Files:**
- Create: `.github/FUNDING.yml`
- Modify: `README.md` (badge + Support section), `chrome-extension/content.js` (panel footer link), `chrome-extension/content.css` (footer style)

- [ ] **Step 1:** `.github/FUNDING.yml`:
  ```yaml
  github: Buckwheet
  ```
- [ ] **Step 2:** README: under a new `## Support` section add `[![Sponsor](https://img.shields.io/github/sponsors/Buckwheet?label=Sponsor)](https://github.com/sponsors/Buckwheet)` plus one line: "Free forever. If this saves you time, a coffee is appreciated."
- [ ] **Step 3:** Panel footer: in the `panel.innerHTML` template, before `</div>` of `ssa-body`, add:
  ```html
  <div class="ssa-footer"><a href="https://github.com/sponsors/Buckwheet" target="_blank" rel="noopener">♥ Support</a></div>
  ```
  Add the matching `.ssa-footer` rule in content.css (small, muted, bottom-padded).
- [ ] **Step 4:** `npm run test && npm run build:ext` — verify nothing broke (test asserts panel creation; add one assertion that `ssa-footer` anchor exists and points at the sponsors URL).
- [ ] **Step 5:** Commit: `git commit -m "feat: donation links (github sponsors)"`.

### Task 7: Store listings

**Files:** none in repo (listing metadata lives in the store dashboards) — but add `docs/store-listing-copy.md` so copy is version-controlled.

- [ ] **Step 1:** Create `docs/store-listing-copy.md` with: name ("SimuStore Automator"), description (2-3 sentences: what it does, same-origin only, collects no data, not affiliated with Simutronics, use at your own risk), category (Productivity), website (repo URL), and the screenshot list.
- [ ] **Step 2:** Screenshots: capture 1280x800 panel-over-store-page shot (CWS requires 1280x800 or 640x400), one cart view, one progress view. Store as `docs/screenshots/`.
- [ ] **Step 3:** **Chrome Web Store:** register developer ($5 one-time) → create item → upload `dist-ext/chrome-<v>.zip` → fill privacy form: "does not collect data" → submit. Review: days.
- [ ] **Step 4:** **Edge Add-ons:** partner center → add new extension → upload same zip → submit (can reuse Chrome assets).
- [ ] **Step 5:** **Firefox AMO:** addons.mozilla.org → submit → upload `dist-ext/firefox-<v>.zip` + source link (GitHub repo) → `web-ext lint` result is attached by CI already → submit.
- [ ] **Step 6:** After approvals, update README install section with the three store links. Commit: `git commit -m "docs: store links"`.

### Task 8: Release

- [ ] **Step 1:** Bump version: `chrome-extension/manifest.json` and `package.json` → `1.1.0` (Task 1-6 changes).
- [ ] **Step 2:** Run the `requesting-code-review` skill flow on the full diff; address findings; re-run lint+tests.
- [ ] **Step 3:** `git tag v1.1.0 && git push --tags`, create GitHub Release from the tag, attach the three zips from CI artifacts.
- [ ] **Step 4:** Verification (verification-before-completion skill): load the built zips unpacked in Chrome and Firefox, run one real purchase flow on the store, confirm panel works and the Support link opens. Record the result in the release notes.

---

### Task 9: Strip the Node.js server path (extension-only repo)

**Decision (user, 2026-08-07):** The Node.js server (Express/Puppeteer) is no longer publicly available or supported. The repo becomes extension-only, in preparation for store submission. Server code remains recoverable in git history; no history rewrite.

**Files:**
- Delete: `src/` (server.ts, automation.ts), `public/`, `tsconfig.json`, `.env.example`
- Modify: `package.json` (remove express + puppeteer deps; remove typescript/nodemon/ts-node/@types/express/@types/node devDeps; remove main + start/dev/build scripts; description becomes extension-only), regenerate package-lock.json
- Modify: `.husky/pre-commit` (drop `npx tsc --noEmit` — no TS remains)
- Modify: `README.md` (rewrite extension-only: remove server sections, Node.js prerequisites, env vars, server security/troubleshooting rows)
- Modify: `SECURITY.md` (drop the localhost-server line)
- Verify: `docs/store-listing-copy.md` and `chrome-extension/README.md` contain no server references (fix if any)

**Gates:** vitest 6/6, biome clean, web-ext lint 0/0/0, `npm run build:ext` (1.1.0 zips), pre-commit chain (now biome + vitest).

---

## Self-Review

- **Spec coverage:** All four asks covered — move-forward strategy (Part A), dev plan (Tasks 0-8), monetization (A5 + Task 6), skills usage (A6 + Task 5 references). 
- **Placeholders:** the test file and build script show real code; the two "fill exact" notes are deliberate (single-line writeFileSync / fixture data) and named explicitly.
- **Consistency:** version stays 1.0.0 until Task 8; gecko id string is identical in Tasks 2/3/6+; function names `scrapeItems` / `validatePurchaseResponse` / `window.SSA` used consistently.
- **Known simplifications (ponytail):** Safari deferred indefinitely (A2); no landing page yet (A5); single shared artifact for Chrome/Edge (identical manifests); `zip` binary dependency in the build script instead of an archiver lib — add `archiver` only if a platform without `zip` appears.
