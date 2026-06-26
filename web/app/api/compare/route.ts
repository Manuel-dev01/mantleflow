import { NextResponse } from "next/server";
import { loadConfig, createCapabilities } from "@mantleflow/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const caps = createCapabilities(loadConfig(process.env as Record<string, string | undefined>));
    const maps = await caps.compareAssets();
    return NextResponse.json({ maps });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
