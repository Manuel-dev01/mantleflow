import { NextResponse } from "next/server";
import { loadConfig, createErc8004Writer, hashResult, type DistributionMap } from "@mantleflow/agent";

// Writes a tamper-evident PROVENANCE receipt to the ERC-8004 Reputation registry: a feedback entry
// whose feedbackHash commits to the exact DistributionMap result. NOT a self-score (value=0). Needs
// the agent key + AGENT_ID; responds honestly (501) when unconfigured rather than faking a tx.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ORIGIN = "https://mantleflow.vercel.app";

function jsonSafe(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  let map: DistributionMap | undefined;
  try {
    ({ map } = (await req.json()) as { map?: DistributionMap });
  } catch {
    return jsonSafe({ error: "Invalid JSON body" }, 400);
  }
  if (!map || !map.asset?.symbol) {
    return jsonSafe({ error: "map (DistributionMap) is required" }, 400);
  }

  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  if (!cfg.agentPrivateKey || !cfg.agentId) {
    return jsonSafe(
      { error: "Attestation unavailable — agent identity / signing key not configured on this deployment." },
      501,
    );
  }

  try {
    const resultHash = hashResult(map);
    const writer = createErc8004Writer(cfg);
    const res = await writer.writeProvenanceReceipt({
      agentId: cfg.agentId,
      symbol: map.asset.symbol,
      resultHash,
      resultUri: `${ORIGIN}/api/map?symbol=${encodeURIComponent(map.asset.symbol)}`,
      endpoint: `${ORIGIN}/app`,
    });
    return jsonSafe({
      txHash: res.txHash,
      resultHash: res.resultHash,
      agentId: res.agentId,
      blockNumber: res.blockNumber,
      verified: res.verified,
      explorerUrl: res.receipt.url,
      receipt: res.receipt,
    });
  } catch (err) {
    return jsonSafe({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
