# Security

The extension collects no data, stores no credentials, and uses zero permissions. Its only `host_permissions` entry is limited to `https://store.play.net/*`, so the panel can run on the store and nowhere else.

The optional local automation server binds to 127.0.0.1 only and protects its `/api/*` routes with a random per-boot token.

To report a security issue, please open a GitHub issue: https://github.com/Buckwheet/SimuStoreAutomatorTS/issues
