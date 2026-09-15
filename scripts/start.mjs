// scripts/start.mjs
// Production startup wrapper to ensure binding to 0.0.0.0 for Render / cloud containers

process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.NITRO_HOST = process.env.NITRO_HOST || "0.0.0.0";
if (!process.env.PORT && process.env.NITRO_PORT) {
  process.env.PORT = process.env.NITRO_PORT;
}

const host = process.env.HOST;
const port = process.env.PORT || 3000;

console.log(`[Travezy Production] Initializing server on ${host}:${port}...`);

try {
  await import("../.output/server/index.mjs");
  console.log(`[Travezy Production] Server successfully listening on http://${host}:${port}`);
} catch (error) {
  console.error("[Travezy Production] Failed to launch server:", error);
  process.exit(1);
}
