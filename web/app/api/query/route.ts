import { NextResponse } from "next/server";
import { loadConfig, runQuery, x402Active, buildChallenge, verifyAndSettle, type Settlement } from "@mantleflow/agent";

// Runs server-side only — API keys never reach the browser. The BASIC natural-language answer is FREE
// (the research agent must actually answer); only the PREMIUM "deep-dive" (body.deep === true) is
// x402-gated. /api/map and the rest stay free. When x402 is disabled even the deep-dive runs free.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** JSON response that tolerates BigInt (serialised as a string). */
function jsonSafe(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  let query: unknown;
  let deep = false;
  try {
    const body = await req.json();
    query = body.query;
    deep = body.deep === true;
  } catch {
    return jsonSafe({ error: "Invalid JSON body" }, 400);
  }
  if (typeof query !== "string" || query.trim().length === 0) {
    return jsonSafe({ error: "query (string) is required" }, 400);
  }

  const config = loadConfig(process.env as Record<string, string | undefined>);
  const resource = `${new URL(req.url).origin}/api/query`;

  // x402 gate — ONLY the premium deep-dive (deep === true) is paid; basic answers are free. No payment
  // → 402 + challenge. Bad/expired payment → 402 + error. When x402 is disabled the deep-dive is free.
  let settlement: Settlement | undefined;
  if (deep && x402Active(config)) {
    const xPayment = req.headers.get("X-PAYMENT");
    if (!xPayment) return jsonSafe(buildChallenge(config, resource), 402);
    try {
      settlement = await verifyAndSettle(config, xPayment, resource);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonSafe({ error: message, ...buildChallenge(config, resource) }, 402);
    }
  }

  try {
    const result = await runQuery(config, query);
    return jsonSafe({ ...result, settlement });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonSafe({ error: message }, 500);
  }
}
