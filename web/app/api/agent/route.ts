import { NextResponse } from "next/server";
import { loadConfig, createErc8004Reader, ERC8004 } from "@mantleflow/agent";

// Reads the agent's ERC-8004 identity + provenance-receipt count from its registered network
// (mainnet by default — D23). No key needed for the reads; honest "registered: false" when AGENT_ID
// isn't set yet.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function jsonSafe(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function GET() {
  try {
    const cfg = loadConfig(process.env as Record<string, string | undefined>);
    const isMain = cfg.erc8004Network === "mainnet";
    const reg = ERC8004[cfg.erc8004Network];
    const registry = {
      chain: isMain ? "eip155:5000" : "eip155:5003",
      network: isMain ? "Mantle" : "Mantle Sepolia",
      identity: reg.identity,
      reputation: reg.reputation,
      explorer: isMain ? "https://explorer.mantle.xyz" : "https://explorer.sepolia.mantle.xyz",
      agentCardUrl: cfg.agentCardUrl,
    };
    if (!cfg.agentId) {
      return jsonSafe({ registered: false, registry });
    }
    const reader = createErc8004Reader(cfg);
    const [identity, reputation] = await Promise.all([
      reader.readIdentity(cfg.agentId),
      reader.readReputation(cfg.agentId).catch(() => null),
    ]);
    return jsonSafe({ registered: true, registry, identity, reputation });
  } catch (err) {
    return jsonSafe({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
