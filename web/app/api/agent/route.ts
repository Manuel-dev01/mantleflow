import { NextResponse } from "next/server";
import { loadConfig, createErc8004Reader, ERC8004 } from "@mantleflow/agent";

// Reads the agent's ERC-8004 identity + provenance-receipt count from Mantle Sepolia. No key needed
// for the reads; honest "registered: false" when AGENT_ID isn't set yet.
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
    const registry = {
      chain: "eip155:5003",
      network: "Mantle Sepolia",
      identity: ERC8004.sepolia.identity,
      reputation: ERC8004.sepolia.reputation,
      explorer: "https://explorer.sepolia.mantle.xyz",
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
