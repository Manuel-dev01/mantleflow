import { NextResponse } from "next/server";
import { loadConfig, createCapabilities } from "@mantleflow/agent";

// Server-side only — keys never reach the browser. Builds one asset's DistributionMap WITHOUT the
// LLM, so the workspace can switch assets/tabs instantly and the landing preview can render fast.
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

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol || symbol.trim().length === 0) {
    return NextResponse.json({ error: "symbol query param is required" }, { status: 400 });
  }
  try {
    const caps = createCapabilities(loadConfig(process.env as Record<string, string | undefined>));
    const map = await caps.buildDistributionMap(symbol);
    return jsonSafe({ map });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
