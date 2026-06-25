/**
 * Live demo: build the MI4 distribution map from real Mantle data and print it.
 * Run with: pnpm -C agent demo   (set ETHERSCAN_API_KEY for source-verified compliance)
 */
import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadConfig } from "./config/env.js";
import { createCapabilities } from "./capabilities.js";

// Load repo-root .env regardless of cwd (dev-only convenience).
loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

async function main() {
  const config = loadConfig(process.env);
  const caps = createCapabilities(config);
  const symbol = process.argv[2] ?? "MI4";

  console.log(`\nBuilding distribution map for ${symbol} from live Mantle data...\n`);
  const map = await caps.buildDistributionMap(symbol);

  console.log(`Asset: ${map.asset.name} (${map.asset.symbol})  ${map.asset.address}`);
  console.log(`Network: ${map.asset.network}   Generated: ${map.generatedAt}\n`);
  console.log("HEADLINES:");
  for (const h of map.headlines) console.log(`  • ${h}`);
  console.log("\nSUB-SCORES:");
  for (const s of map.subScores) {
    const v = s.value === null ? "—" : String(s.value);
    console.log(`  [${s.status.padEnd(16)}] ${s.label}: ${v}`);
    console.log(`      ${s.explanation}`);
    for (const inp of s.inputs) {
      const r = (inp as { receipt?: { sourceName: string; note?: string } }).receipt;
      if (r) console.log(`        ↳ ${r.sourceName}${r.note ? ` — ${r.note}` : ""}`);
    }
  }
  console.log(`\nComposite: ${map.composite ?? "null (required sub-scores not yet computed)"}\n`);
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
