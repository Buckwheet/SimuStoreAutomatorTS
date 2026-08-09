# Security

The extension collects no data, stores no credentials, and uses zero permissions. Its only `host_permissions` entry is limited to `https://store.play.net/*`, so the panel can run on the store and nowhere else.

To report a security issue, please open a GitHub issue: https://github.com/Buckwheet/SimuStoreAutomatorTS/issues
## Known advisories (dev tooling only)

`npm audit` reports 3 high-severity advisories, all in `image-size`
(`range: *`, no fixed release upstream), a transitive dependency of the
`web-ext`/addons-linter dev tooling. They are only reachable by running
`web-ext lint` against an untrusted extension zip; the shipped extension has
zero runtime dependencies and is not affected.
