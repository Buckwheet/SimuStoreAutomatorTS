// Fails the build with a clear message if the running Node version does not
// satisfy the "engines.node" floor declared in package.json.
//
// Why: Dependabot once proposed jsdom 30 (engines: Node >= 22) while CI runs
// Node 20, and the failure surfaced as a cryptic "webidl.util.markAsUncloneable
// is not a function" crash inside vitest. This step runs right after
// setup-node so any dependency upgrade that outpaces the Node floor fails
// fast and legibly instead.
const { engines } = require("../package.json");
const required = engines?.node;
if (!required) process.exit(0);
const m = String(required).match(/^([><=]+)\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
if (!m) process.exit(0); // unsupported range syntax; skip the check
const cur = process.versions.node.split(".").map(Number);
const [, op, maj, min = 0, pat = 0] = m;
const req = [Number(maj), Number(min), Number(pat)];
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const d = cmp(cur, req);
const ok =
	op === ">="
		? d >= 0
		: op === ">"
			? d > 0
			: op === "<"
				? d < 0
				: op === "<="
					? d <= 0
					: d === 0;
if (!ok) {
	console.error(
		`✗ Node ${process.versions.node} does not satisfy engines.node "${required}" in package.json.`,
	);
	process.exit(1);
}
console.log(
	`✓ Node ${process.versions.node} satisfies engines.node "${required}"`,
);
