# Changelog

All notable changes to the SimuStore Automator extension are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).

## [1.1.2] - 2026-08-09

Security audit run 3 (Cloudflare security-audit-skill methodology, run 3 of 3:
no MEDIUM+ findings; two LOW issues fixed).

### Fixed

- **Cart price fidelity** — cart entries now dedupe by id AND cost AND name.
  Two store cards sharing an id at different prices previously merged
  silently at the first card's price, so the Buy-All confirm total could
  misrepresent what was added; identical-id/different-price cards now render
  as separate lines and the total is truthful.
- **Panel stays on-screen** — drag and resize positions are clamped to the
  viewport, so the panel can no longer be dragged fully off-screen (reload
  was the only recovery); a window-blur listener clears a drag/resize left
  stuck by a focus loss (e.g. Alt-Tab mid-gesture).

### Changed

- SECURITY.md: corrected the residual dev-tooling advisory count — image-size
  is pinned at exactly 2.0.2 with **2** unfixed high advisories (CVE-2025-71319
  is fixed in 2.0.2), not 3.

### Security

- No new advisories; the same 2 dev-only image-size residuals remain (linter
  only, nothing ships).

## [1.1.1] - 2026-08-09

Security-focused patch release following two full security audits
(Cloudflare security-audit-skill methodology, runs 1 and 2; no MEDIUM+ issues
found in the shipped extension).

### Fixed

- **Quantity input validated** — quantities are clamped to [1, 999] at both the
  cart and per-item Buy entry points, and cart accumulation is capped. Entering
  `0`, a negative, or a 20-digit quantity no longer silently buys 1 item,
  produces negative totals, or starts an unbounded purchase loop.
- **Checkout reentry** — the reentry guard now runs before the cart is cleared,
  so a reentrant checkout can no longer silently discard the queued items; the
  qty inputs, +Cart, remove, and Clear controls are disabled while a purchase
  runs.
- **Truthful result reporting** — the final status reports the real counts
  (`Done! Purchased X of N item(s).` or `Finished: purchased X of N, Y failed`)
  instead of always claiming success; the UI lock is released via `try/finally`.
- **Purchase timeout** — each purchase request is bounded by a 30s
  `AbortSignal.timeout`; a stalled connection no longer leaves the panel
  permanently locked.
- **Item cost validation** — items with missing or unparsable prices are skipped
  instead of being offered at `NaN`/`0 SC`.
- **Request hardening** — the purchase URL is built with `URLSearchParams` and
  item icons are only ever loaded from `https://store.play.net/`.

### Changed

- **Dev floor:** Node.js 20 or newer (web-ext 10 requires it; Node 18 is EOL).
- **Toolchain:** web-ext 9 -> 10 (clears 9 of 12 dev-only npm advisories),
  vitest 3 -> 4, biome 2.3 -> 2.5, jsdom stays 26 (jsdom 30 needs Node >= 22).
- **CI:** actions pinned to commit SHAs, least-privilege workflow token,
  Dependabot for npm + GitHub Actions.

### Security

- Dev-only npm advisories reduced 14 -> 3 high, all in `image-size`
  (`range: *`, no upstream fix; only reachable by linting an untrusted
  extension zip — nothing ships in the extension).
- Remaining residual advisories documented in `SECURITY.md`.

## [1.1.0] - 2026-08-07

- Extension-only repo (Node server path archived)
- Test harness: vitest + jsdom over the real content script
- Firefox support: gecko manifest block, web-ext lint clean
- Packaging: `npm run build:ext` -> chrome/edge/firefox zips
- CI: biome + vitest + web-ext lint + packaging on every push/PR
- SECURITY.md, GitHub Sponsors links, store listing copy

## [1.0.0] - 2026-04-27

- Initial release: MV3 Chrome/Edge extension, bulk-purchase panel on
  `store.play.net`.
