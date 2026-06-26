import { NextResponse } from "next/server";
import { loadConfig, runQuery } from "@mantleflow/agent";

// Runs server-side only — API keys never reach the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** JSON response that tolerates BigInt (serialised as a string). */
function jsonSafe(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, { status, headers: { "content-type": "application/json" } });
}

export async function POST(req: Request) {
  let query: unknown;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query (string) is required" }, { status: 400 });
  }
  try {
    const config = loadConfig(process.env as Record<string, string | undefined>);
    const result = await runQuery(config, query);
    return jsonSafe(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
