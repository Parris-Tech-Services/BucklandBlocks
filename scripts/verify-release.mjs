import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const publicDir = join(process.cwd(), "dist", "public");

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else files.push(path);
  }
  return files;
}

const files = await filesUnder(publicDir);
const jsFiles = files.filter((file) => file.endsWith(".js"));
if (jsFiles.length === 0) throw new Error("release check: no client JavaScript bundle found");

const bundles = await Promise.all(jsFiles.map((file) => readFile(file, "utf8")));
const bundle = bundles.join("\n");
const requiredMarkers = [
  "consumeMousePress",
  "hasMousePress",
];

for (const marker of requiredMarkers) {
  if (!bundle.includes(marker)) {
    throw new Error(`release check: client bundle is missing required gameplay API: ${marker}`);
  }
}

console.log(`release check passed: ${jsFiles.length} client bundle(s), gameplay input API present`);
