import { NextResponse } from "next/server";
import { loadConfig, createErc8004Reader } from "@mantleflow/agent";

// Independently verify a provenance attestation: anyone with the tx hash + the result hash can
// confirm the on-chain MetadataSet commitment (re-reads the tx receipt — reliable, unbounded).
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tx = url.searchParams.get("tx");
  const hash = url.searchParams.get("hash");
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  const agentId = url.searchParams.get("agentId") ?? cfg.agentId;

  if (!tx || !hash) return jsonSafe({ error: "tx and hash query params are required" }, 400);
  if (!agentId) return jsonSafe({ error: "agentId not configured and not provided" }, 400);

  try {
    const reader = createErc8004Reader(cfg);
    const result = await reader.verifyAttestation(tx as `0x${string}`, agentId, hash as `0x${string}`);
    return jsonSafe(result);
  } catch (err) {
    return jsonSafe({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
