/**
 * Register MantleFlow's ERC-8004 agent identity on Mantle Sepolia (D2 Sepolia-first, D4 identity).
 * Idempotent at the script level: if AGENT_ID is already set, it just reads/prints the identity.
 *
 * Run (owner, with a funded testnet key in agent/.env):
 *   pnpm -C agent exec tsx src/scripts/register-identity.ts
 *
 * After a fresh registration, record the printed agentId in:
 *   - agent/.env  + web/.env.local  + Vercel env  →  AGENT_ID=<id>
 *   - docs/VERIFIED.md (agentId + tx hash + date)
 */
import "dotenv/config";
import { loadConfig } from "../config/env.js";
import { createErc8004Reader, createErc8004Writer } from "../erc8004/client.js";

async function main() {
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  if (!cfg.agentPrivateKey) {
    console.error("AGENT_PRIVATE_KEY not set. Add a FRESH testnet-only key to agent/.env first.");
    process.exit(1);
  }

  const writer = createErc8004Writer(cfg);
  const bal = await writer.balanceWei();
  console.log("Agent wallet:", writer.address);
  console.log("Balance:", Number(bal) / 1e18, "MNT");
  if (bal === 0n) {
    console.error("UNFUNDED — get Sepolia MNT at https://faucet.sepolia.mantle.xyz, then re-run.");
    process.exit(1);
  }

  // Idempotent: already registered → just show it.
  if (cfg.agentId) {
    const view = await createErc8004Reader(cfg).readIdentity(cfg.agentId);
    console.log("\nAlready registered (AGENT_ID set):");
    console.log(JSON.stringify(view.value, null, 2));
    console.log("Explorer:", view.receipt.url);
    return;
  }

  console.log("\nRegistering identity with agentURI:", cfg.agentCardUrl);
  const res = await writer.registerIdentity(cfg.agentCardUrl);
  console.log("\n✓ Registered.");
  console.log("  agentId:", res.agentId);
  console.log("  tx:", res.txHash);
  console.log("  explorer:", res.receipt.url);
  console.log("\nNEXT: set AGENT_ID=" + res.agentId + " in agent/.env, web/.env.local, and Vercel env;");
  console.log("      record agentId + tx in docs/VERIFIED.md.");
}

main().catch((e) => {
  console.error("register-identity failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
