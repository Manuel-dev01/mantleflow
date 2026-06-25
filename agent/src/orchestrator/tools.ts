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
        "Compute the Distribution Score map for a tracked asset from live Mantle data: secondary-market reachability and compliance gating (computed), plus liquidity depth, fragmentation, borrowability, cross-chain reach (not yet computed in this phase). Every datum carries a source receipt. This is the authoritative source — only state numbers it returns.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string", description: "Asset symbol, e.g. MI4." } },
        required: ["symbol"],
      },
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
    default:
      return JSON.stringify({ error: `Unknown tool ${name}` });
  }
}
