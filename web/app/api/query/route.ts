import { NextResponse } from "next/server";
import { loadConfig, runQuery } from "@mantleflow/agent";

// Runs server-side only — API keys never reach the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
