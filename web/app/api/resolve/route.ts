import { NextResponse } from "next/server";
import { loadConfig, createCapabilities } from "@mantleflow/agent";

// Resolve a symbol / name / 0x address (curated or arbitrary) → an asset descriptor. Powers the
// "analyze any Mantle asset" input's validation + the agent's asset resolution. Server-side only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const network = params.get("network") === "sepolia" ? "sepolia" : "mainnet";
  if (!q) return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  try {
    const caps = createCapabilities(loadConfig(process.env as Record<string, string | undefined>));
    const asset = await caps.resolveAsset(q, network);
    if (!asset) {
      return NextResponse.json({ resolved: false, featured: caps.getFeaturedAssets() });
    }
    return NextResponse.json({
      resolved: true,
      symbol: asset.symbol,
      name: asset.name,
      address: asset.address,
      network: asset.network,
      curated: asset.curated,
      issuer: asset.issuer ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
