# Security

The extension collects no data, stores no credentials, and uses zero permissions. Its only `host_permissions` entry is limited to `https://store.play.net/*`, so the panel can run on the store and nowhere else.

To report a security issue, please open a GitHub issue: https://github.com/Buckwheet/SimuStoreAutomatorTS/issues
## Known advisories (dev tooling only)

`npm audit` reports 2 high-severity advisories, both in `image-size`
(exact pin `2.0.2`, no fixed release upstream — GHSA-5p2g-fcmc-qvqq JXL/HEIF
and GHSA-w3rx-r6r6-pgpr ICNS; CVE-2025-71319 was fixed in 2.0.2), a
transitive dependency of the `web-ext`/addons-linter dev tooling. They are only reachable by running
`web-ext lint` against an untrusted extension zip; the shipped extension has
zero runtime dependencies and is not affected.
