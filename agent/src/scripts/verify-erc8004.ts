/**
 * Verification gate: confirm Mantle Sepolia is reachable and that the
 * deployed ERC-8004 Identity + Reputation registries expose the write methods we intend to call,
 * BEFORE we wire any on-chain write. Prints the relevant function signatures from the deployed ABI.
 *
 * Run: pnpm -C agent exec tsx src/scripts/verify-erc8004.ts
 */
import "dotenv/config";
import { createPublicClient, http } from "viem";
import { mantleSepoliaTestnet } from "viem/chains";
import { ERC8004 } from "../config/addresses.js";
import { loadConfig } from "../config/env.js";

const EXPLORER_API = "https://explorer.sepolia.mantle.xyz/api";

interface AbiFn {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: { name?: string; type: string }[];
  outputs?: { type: string }[];
}

function sig(fn: AbiFn): string {
  const ins = (fn.inputs ?? []).map((i) => `${i.type}${i.name ? " " + i.name : ""}`).join(", ");
  const outs = (fn.outputs ?? []).map((o) => o.type).join(", ");
  return `${fn.name}(${ins})${outs ? " → " + outs : ""} [${fn.stateMutability}]`;
}

async function getAbi(address: string): Promise<AbiFn[] | null> {
  try {
    const url = `${EXPLORER_API}?module=contract&action=getabi&address=${address}`;
    const res = await fetch(url);
    const json = (await res.json()) as { status: string; result: string };
    if (json.status !== "1") {
      console.log(`  ! getabi status=${json.status} (${String(json.result).slice(0, 80)})`);
      return null;
    }
    return JSON.parse(json.result) as AbiFn[];
  } catch (e) {
    console.log(`  ! getabi threw: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

function printMatching(label: string, abi: AbiFn[] | null, needles: string[]) {
  console.log(`\n=== ${label} ===`);
  if (!abi) {
    console.log("  (ABI unavailable — will confirm by on-chain simulation at registration time)");
    return;
  }
  const fns = abi.filter((f) => f.type === "function");
  console.log(`  total functions: ${fns.length}`);
  for (const n of needles) {
    const hits = fns.filter((f) => f.name?.toLowerCase().includes(n.toLowerCase()));
    for (const h of hits) console.log(`  • ${sig(h)}`);
  }
}

async function main() {
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  const client = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(cfg.mantleSepoliaRpc),
  });

  console.log("Mantle Sepolia RPC:", cfg.mantleSepoliaRpc);
  const chainId = await client.getChainId();
  console.log("chainId:", chainId, chainId === 5003 ? "✓ (5003)" : "✗ EXPECTED 5003");

  const reg = ERC8004.sepolia;
  for (const [label, addr] of [
    ["Identity", reg.identity],
    ["Reputation", reg.reputation],
  ] as const) {
    const code = await client.getCode({ address: addr });
    console.log(`\n${label} ${addr}: code ${code && code !== "0x" ? `present (${code.length} chars)` : "MISSING"}`);
  }

  const identAbi = await getAbi(reg.identity);
  printMatching("Identity ABI — write/read surface", identAbi, [
    "register",
    "setAgentURI",
    "setTokenURI",
    "tokenURI",
    "agentURI",
    "ownerOf",
    "agentOf",
    "totalAgents",
    "setMetadata",
  ]);

  const repAbi = await getAbi(reg.reputation);
  printMatching("Reputation ABI — write/read surface", repAbi, [
    "giveFeedback",
    "feedback",
    "getSummary",
    "readFeedback",
    "revoke",
  ]);

  if (cfg.agentPrivateKey) {
    const { walletClientForSepolia } = await import("../config/chains.js");
    const w = walletClientForSepolia(cfg.agentPrivateKey, cfg.mantleSepoliaRpc);
    const bal = await w.public.getBalance({ address: w.account.address });
    console.log(`\nAgent wallet ${w.account.address}: ${Number(bal) / 1e18} MNT`);
    if (bal === 0n) console.log("  ! UNFUNDED — get Sepolia MNT at https://faucet.sepolia.mantle.xyz");
  } else {
    console.log("\nAGENT_PRIVATE_KEY not set — set it (testnet-only) to enable funding check + writes.");
  }
}

main().catch((e) => {
  console.error("verify-erc8004 failed:", e instanceof Error ? e.message : String(e));
  if (e instanceof Error && e.stack) console.error(e.stack.split("\n").slice(0, 4).join("\n"));
  process.exit(1);
});
