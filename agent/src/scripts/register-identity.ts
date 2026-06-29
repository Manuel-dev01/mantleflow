/**
 * Register MantleFlow's ERC-8004 agent identity on `ERC8004_NETWORK` (mainnet by default; dual-
 * network). Idempotent at the script level: if AGENT_ID is already set, it just reads/prints it.
 *
 * Run (owner, with a funded agent key in agent/.env):
 *   ERC8004_NETWORK=mainnet pnpm -C agent exec tsx src/scripts/register-identity.ts
 *
 * NOTE: registering a NEW agentId on mainnet requires AGENT_ID to be UNSET (309 is a Sepolia id).
 * After a fresh registration, set the printed agentId in:
 *   - agent/.env  + web/.env.local  + Vercel env  →  AGENT_ID=<id> (+ ERC8004_NETWORK=mainnet)
 */
import "dotenv/config";
import { loadConfig } from "../config/env.js";
import { createErc8004Reader, createErc8004Writer } from "../erc8004/client.js";

async function main() {
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  if (!cfg.agentPrivateKey) {
    console.error("AGENT_PRIVATE_KEY not set. Add the funded agent key to agent/.env first.");
    process.exit(1);
  }
  const isMain = cfg.erc8004Network === "mainnet";
  console.log("ERC-8004 network:", cfg.erc8004Network);

  const writer = createErc8004Writer(cfg);
  const bal = await writer.balanceWei();
  console.log("Agent wallet:", writer.address);
  console.log("Balance:", Number(bal) / 1e18, "MNT");
  if (bal === 0n) {
    console.error(
      isMain
        ? "UNFUNDED — fund the agent wallet with real Mantle (mainnet) MNT for gas, then re-run."
        : "UNFUNDED — get Sepolia MNT at https://faucet.sepolia.mantle.xyz, then re-run.",
    );
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
  console.log("\nNEXT: set AGENT_ID=" + res.agentId + " in agent/.env, web/.env.local, and Vercel env.");
}

main().catch((e) => {
  console.error("register-identity failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
