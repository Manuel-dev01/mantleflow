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
        "Resolve a natural-language mention of a tokenized/RWA asset on Mantle to a tracked asset. Returns the asset's symbol/name/address, or the list of tracked assets if unknown.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The user's asset mention." } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_distribution_map",
      description:
        "Compute the Distribution Score map for a tracked asset from live Mantle data: secondary-market reachability, liquidity depth (±2% of mid), fragmentation (HHI), borrowability (Lendle), and compliance gating are computed; cross-chain reach is not yet computed. Every datum carries a source receipt. This is the authoritative source — only state numbers it returns.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string", description: "Asset symbol, e.g. MI4." } },
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
      const asset = ctx.caps.resolveAsset(String(args.query ?? ""));
      if (!asset) {
        return JSON.stringify({
          resolved: false,
          trackedAssets: Object.keys(TRACKED_ASSETS),
        });
      }
      return JSON.stringify({
        resolved: true,
        symbol: asset.symbol,
        name: asset.name,
        address: asset.address,
        network: asset.network,
        issuer: asset.issuer,
      });
    }
    case "get_distribution_map": {
      const map = await ctx.caps.buildDistributionMap(String(args.symbol ?? ""));
      ctx.collected.map = map;
      // Compact projection for the model: keep sub-score findings + receipts so it can cite sources.
      return JSON.stringify({
        asset: map.asset,
        headlines: map.headlines,
        composite: map.composite,
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
