# Release Checklist

Public, sanitized release-to-stores procedure. Replace the deleted internal plan
(`docs/superpowers/`, purged 2026-08-09); it contains no internal strategy —
only the mechanical steps.

## Before release: version bump

1. Decide the version number by [semver](https://semver.org/):
   patch `X.Y.Z+1` for bug fixes/hardening, minor for new features, major for
   breaking changes.
2. Branch `release/<version>` off `master`.
3. Bump `"version"` in **both** `package.json` and `chrome-extension/manifest.json`.
4. Add a `CHANGELOG.md` entry (Keep a Changelog format).
5. Update the README build example (`*-<version>.zip`) if it embeds the version.
6. Verify: `npm test` (12/12), `npx biome check .` clean,
   `npx web-ext lint --source-dir chrome-extension` 0/0/0, `npm run build:ext`
   produces the three zips.
7. Open the release PR → merge to `master` (branch protection requires CI
   green; you approve the merge).

## Release

8. Tag and push: `git tag -a v<version> -m "v<version> — <summary>"` then
   `git push origin v<version>`.
9. Create the GitHub Release from the tag and attach the three zips:
   `gh release create v<version> dist-ext/chrome-<version>.zip
   dist-ext/edge-<version>.zip dist-ext/firefox-<version>.zip --title ... --notes ...`

## Store submissions (needs store accounts)

10. **Firefox AMO:** addons.mozilla.org → submit → `dist-ext/firefox-<version>.zip`
    + source link (this repo). Paste `docs/reviewer-notes.md` into
    "Notes to reviewers". Desktop-only unless Android is tested (see notes).
11. **Chrome Web Store:** developer dashboard → new item → `dist-ext/chrome-<version>.zip`
    → privacy form: "does not collect data" → submit. (One-time $5 developer fee.)
12. **Microsoft Edge Add-ons:** partner center → add → same zip as Chrome →
    submit.
13. **Smoke test before/while submitting:** load a built zip unpacked in Chrome
    and Firefox, run one real purchase flow on the store, confirm the panel and
    the Support link work.

## After approval

14. Fill in the store URLs in the README `## Installation` table and commit.
15. Note any reviewer feedback as follow-up issues/PRs.

## History-rewrite caveat (2026-08-09)

The repo history was rewritten (git filter-branch) to purge an internal plan.
Commit hashes before that date are invalid; re-clone instead of reusing old
clones. Do **not** force-push `master` again — branch protection blocks it.
