/**
 * Smoke-test the provenance-write path end-to-end: read the identity back, then write ONE provenance
 * receipt (giveFeedback) committing to a sample result hash, and read the summary count.
 * Run: pnpm -C agent exec tsx src/scripts/attest-smoke.ts
 */
import "dotenv/config";
import { loadConfig } from "../config/env.js";
import { createErc8004Reader, createErc8004Writer, hashResult } from "../erc8004/client.js";

async function main() {
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  if (!cfg.agentId) throw new Error("AGENT_ID not set");

  const reader = createErc8004Reader(cfg);
  const id = await reader.readIdentity(cfg.agentId);
  console.log("identity:", JSON.stringify(id.value));

  const writer = createErc8004Writer(cfg);
  const sample = { asset: { symbol: "SMOKE" }, composite: 42, note: "attest-smoke" };
  const resultHash = hashResult(sample);
  console.log("committing resultHash:", resultHash);

  const res = await writer.writeProvenanceReceipt({
    agentId: cfg.agentId,
    symbol: "SMOKE",
    resultHash,
    resultUri: "https://mantleflow.vercel.app/api/map?symbol=SMOKE",
    endpoint: "https://mantleflow.vercel.app/app",
  });
  console.log("✓ provenance tx:", res.txHash);
  console.log("  explorer:", res.receipt.url);
  console.log("  (the tx emits a MetadataSet event: agentId + keccak(resultHash) — verifiable on the explorer)");
}

main().catch((e) => {
  console.error("attest-smoke failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
