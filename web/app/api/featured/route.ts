import { NextResponse } from "next/server";
import { loadConfig, createCapabilities } from "@mantleflow/agent";

// The curated FEATURED assets (single source of truth for the app's chips). Any Mantle token can
// also be analyzed by address via /api/map or /api/resolve.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const caps = createCapabilities(loadConfig(process.env as Record<string, string | undefined>));
    return NextResponse.json({ featured: caps.getFeaturedAssets() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
