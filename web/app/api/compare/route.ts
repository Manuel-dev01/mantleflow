import { NextResponse } from "next/server";
import { loadConfig, createCapabilities } from "@mantleflow/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonSafe(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, { status, headers: { "content-type": "application/json" } });
}

export async function GET() {
  try {
    const caps = createCapabilities(loadConfig(process.env as Record<string, string | undefined>));
    const maps = await caps.compareAssets();
    return jsonSafe({ maps });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
