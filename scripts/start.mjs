// scripts/start.mjs
// Production startup wrapper to ensure 0.0.0.0 binding and robust entry resolution on Render

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.NITRO_HOST = process.env.NITRO_HOST || "0.0.0.0";
if (!process.env.PORT && process.env.NITRO_PORT) {
  process.env.PORT = process.env.NITRO_PORT;
}

const host = process.env.HOST;
const port = process.env.PORT || 3000;

console.log(`[Travezy Production] Initializing server on ${host}:${port}...`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const candidatePaths = [
  path.join(rootDir, ".output", "server", "index.mjs"),
  path.join(rootDir, "dist", "server", "index.mjs"),
  path.join(rootDir, ".output", "server", "index.js"),
  path.join(rootDir, "dist", "server", "index.js"),
];

let entryPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    entryPath = p;
    break;
  }
}

if (!entryPath) {
  console.error("[Travezy Production] Server entry not found in candidate paths:", candidatePaths);
  console.error("[Travezy Production] Available files in root directory:", fs.readdirSync(rootDir));
  if (fs.existsSync(path.join(rootDir, "dist"))) {
    console.error("[Travezy Production] Contents of dist/:", fs.readdirSync(path.join(rootDir, "dist")));
  }
  if (fs.existsSync(path.join(rootDir, ".output"))) {
    console.error("[Travezy Production] Contents of .output/:", fs.readdirSync(path.join(rootDir, ".output")));
  }
  process.exit(1);
}

console.log(`[Travezy Production] Loading server entry from: ${entryPath}`);

try {
  await import(pathToFileURL(entryPath).href);
  console.log(`[Travezy Production] Server successfully listening on http://${host}:${port}`);
} catch (error) {
  console.error("[Travezy Production] Error during server execution:", error);
  process.exit(1);
}
