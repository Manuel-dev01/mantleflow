#!/usr/bin/env -S npx tsx
/**
 * MantleFlow MCP server (stdio).
 *
 * Exposes the distribution-mapping capabilities as MCP tools so ANY agent (Claude Desktop, the
 * Claude CLI, another A2A agent) can ask where a tokenized asset on Mantle can actually trade,
 * borrow, bridge, and who is gated — every datum carrying a SourceReceipt. This is the server the
 * MantleFlow AI Agent Skill (skill/mantleflow-distribution) wraps.
 *
 * Run: pnpm -C mcp start   (or `npx tsx mcp/src/server.ts`)
 * Requires the same env as the web app: ETHERSCAN_API_KEY, MANTLE_MAINNET_RPC (Alchemy), etc.
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig, createCapabilities, ERC8004 } from "@mantleflow/agent";

const config = loadConfig(process.env as Record<string, string | undefined>);
const caps = createCapabilities(config);

// Stringify maps/values with BigInt tolerance (mirrors the web API's jsonSafe).
function asText(data: unknown) {
  const text = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
  return { content: [{ type: "text" as const, text }] };
}

const server = new McpServer({
  name: "mantleflow-distribution",
  version: "0.1.0",
});

server.tool(
  "list_tracked_assets",
  "List the tokenized/RWA assets MantleFlow tracks on Mantle (symbols).",
  {},
  async () => asText({ assets: caps.trackedSymbols() }),
);

server.tool(
  "resolve_asset",
  "Resolve a natural-language mention of a Mantle RWA/asset to a tracked symbol (or null).",
  { query: z.string().describe("e.g. 'the Mantle index fund' or 'staked eth'") },
  async ({ query }) => asText({ resolved: caps.resolveAsset(query) }),
);

server.tool(
  "get_distribution_map",
  "Compute the live Distribution Score map for one tracked asset (reachability, liquidity depth, " +
    "fragmentation, borrowability, compliance gate; cross-chain is Phase 4). Every datum is sourced.",
  { symbol: z.string().describe("tracked symbol, e.g. MI4, mETH, fBTC, USDe, USDY, cmETH") },
  async ({ symbol }) => asText({ map: await caps.buildDistributionMap(symbol) }),
);

server.tool(
  "compare_assets",
  "Build the Distribution Score map for every tracked asset, ranked — the side-by-side leaderboard.",
  {},
  async () => asText({ maps: await caps.compareAssets() }),
);

server.tool(
  "get_agent_identity",
  "Return MantleFlow's ERC-8004 identity registry coordinates on Mantle Sepolia + the agentId (if set).",
  {},
  async () =>
    asText({
      chain: "eip155:5003",
      identityRegistry: ERC8004.sepolia.identity,
      reputationRegistry: ERC8004.sepolia.reputation,
      agentId: process.env.AGENT_ID ?? null,
      agentCard: config.agentCardUrl,
    }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout (it's the protocol channel); log to stderr.
  console.error("mantleflow-distribution MCP server ready (stdio).");
}

main().catch((e) => {
  console.error("MCP server failed:", e);
  process.exit(1);
});
