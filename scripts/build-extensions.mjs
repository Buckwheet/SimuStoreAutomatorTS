import {
	copyFileSync,
	createWriteStream,
	mkdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { ZipArchive } from "archiver";

const version = JSON.parse(
	readFileSync("chrome-extension/manifest.json", "utf8"),
).version;

const outDir = "dist-ext";
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const out = `${outDir}/chrome-${version}.zip`;
const output = createWriteStream(out);
const closed = new Promise((resolve, reject) => {
	output.on("close", resolve);
	output.on("error", reject);
});

const archive = new ZipArchive({ zlib: { level: 9 } });
archive.pipe(output);
archive.directory("chrome-extension", false);
await archive.finalize();
await closed;

for (const store of ["edge", "firefox"]) {
	copyFileSync(out, `${outDir}/${store}-${version}.zip`);
}

console.log(`Built ${out}, edge-${version}.zip, firefox-${version}.zip`);
