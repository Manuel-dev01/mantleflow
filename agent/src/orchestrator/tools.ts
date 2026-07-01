import type OpenAI from "openai";
import type { Capabilities } from "../capabilities.js";
import type { DistributionMap } from "../engine/types.js";
import { TRACKED_ASSETS } from "../config/addresses.js";

/** Shared run state: tools stash the structured map so the UI can render it next to the NL answer. */
export interface ToolContext {
  caps: Capabilities;
  collected: { map?: DistributionMap };
}

export const TOOL_DEFS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "resolve_asset",
      description:
        "Resolve a mention of ANY Mantle token to an asset: a curated symbol/name, OR an arbitrary contract address (0x…), OR an uncurated symbol (searched). Returns symbol/name/address/network + whether it is a curated (featured) asset. Returns the featured list if it cannot resolve.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The user's asset mention or a 0x contract address." },
          network: { type: "string", enum: ["mainnet", "sepolia"], description: "Mantle network (default mainnet)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_distribution_map",
      description:
        "Compute the Distribution Score map for ANY Mantle token (a curated symbol OR a 0x contract address) from live data: real DEX trading venues + liquidity + 24h volume (GeckoTerminal across all Mantle DEXs), liquidity depth (±2% of mid, estimated), fragmentation (HHI), borrowability (Lendle), cross-chain reach (LayerZero OFT / CCIP), compliance gating, token market facts, plus whether it is a curated (featured) asset and a heuristic RWA classification. Every datum carries a source receipt. This is the authoritative source — only state numbers it returns.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Asset symbol (e.g. MI4) OR a 0x contract address." },
          network: { type: "string", enum: ["mainnet", "sepolia"], description: "Mantle network (default mainnet)." },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_assets",
      description:
        "Compare every tracked Mantle asset side by side: each asset's sub-scores, partial composite, and headline findings from live data. Use for 'compare', 'rank', or 'which asset is most distributed' questions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  switch (name) {
    case "resolve_asset": {
      const network = args.network === "sepolia" ? "sepolia" : "mainnet";
      const asset = await ctx.caps.resolveAsset(String(args.query ?? ""), network);
      if (!asset) {
        return JSON.stringify({
          resolved: false,
          featuredAssets: Object.keys(TRACKED_ASSETS),
          hint: "Not a curated symbol and no match found — pass a 0x contract address to analyze any Mantle token.",
        });
      }
      return JSON.stringify({
        resolved: true,
        symbol: asset.symbol,
        name: asset.name,
        address: asset.address,
        network: asset.network,
        curated: asset.curated,
        issuer: asset.issuer ?? null,
      });
    }
    case "get_distribution_map": {
      const network = args.network === "sepolia" ? "sepolia" : undefined;
      const map = await ctx.caps.buildDistributionMap(String(args.symbol ?? ""), network);
      ctx.collected.map = map;
      // Top trading venues (swap only) from the liquidity sub-score — so the model cites real names.
      const liq = map.subScores.find((s) => s.id === "liquidity-depth");
      const venues = (liq?.inputs ?? [])
        .map((i) => i.value as { venue: string; venueType?: string; dex?: string; liquidityUsd?: number; volume24hUsd?: number; slipPctAt250k?: number | null; method?: string })
        .filter((v) => v.venueType === "swap")
        .slice(0, 8)
        .map((v) => ({ venue: v.venue, dex: v.dex, liquidityUsd: v.liquidityUsd, volume24hUsd: v.volume24hUsd, slipPctAt250k: v.slipPctAt250k, method: v.method }));
      const borrow = (map.subScores.find((s) => s.id === "borrowability")?.inputs?.[0]?.value ?? null) as Record<string, unknown> | null;
      return JSON.stringify({
        asset: {
          symbol: map.asset.symbol,
          name: map.asset.name,
          address: map.asset.address,
          network: map.asset.network,
          curated: map.asset.curated,
          classification: map.asset.classification
            ? { class: map.asset.classification.class, confidence: map.asset.classification.confidence }
            : null,
          issuerHint: map.asset.context?.issuerHint ?? null,
        },
        facts: map.facts
          ? { priceUsd: map.facts.priceUsd, marketCapUsd: map.facts.marketCapUsd, fdvUsd: map.facts.fdvUsd, volume24hUsd: map.facts.volume24hUsd, totalSupply: map.facts.totalSupply }
          : null,
        headlines: map.headlines,
        composite: map.composite,
        compositeNote: map.compositeNote,
        tradingVenues: venues, // real DEX pools (GeckoTerminal); empty = genuinely no on-chain venue
        borrowability: borrow,
        subScores: map.subScores.map((s) => ({
          id: s.id,
          status: s.status,
          value: s.value,
          explanation: s.explanation,
          sources: s.inputs
            .map((i) => (i as { receipt?: { sourceName: string; url: string } }).receipt)
            .filter(Boolean),
        })),
      });
    }
    case "compare_assets": {
      const maps = await ctx.caps.compareAssets();
      return JSON.stringify(
        maps.map((m) => ({
          symbol: m.asset.symbol,
          composite: m.composite,
          compositeNote: m.compositeNote,
          headlines: m.headlines,
          subScores: m.subScores.map((s) => ({ id: s.id, status: s.status, value: s.value })),
        })),
      );
    }
    default:
      return JSON.stringify({ error: `Unknown tool ${name}` });
  }
}
