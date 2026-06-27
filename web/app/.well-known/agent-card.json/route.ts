import { NextResponse } from "next/server";
import { ERC8004 } from "@mantleflow/agent";

// The ERC-8004 AgentCard — the JSON a judge (or another agent) resolves from the registered
// agentURI. Served at the stable https URL we register on-chain.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = "https://mantleflow.vercel.app";

export async function GET() {
  const agentId = process.env.AGENT_ID ?? null;
  const card = {
    type: "AgentCard",
    name: "MantleFlow",
    description:
      "Research agent that maps the DISTRIBUTION (not issuance) of tokenized/RWA assets on Mantle: " +
      "where an asset can be bought, sold, borrowed against, bridged, and exactly who is gated from " +
      "holding it. Every datum carries a source receipt.",
    image: `${ORIGIN}/icon.png`,
    url: ORIGIN,
    services: [
      { type: "web", name: "MantleFlow App", url: `${ORIGIN}/app` },
      { type: "http-api", name: "Query API", url: `${ORIGIN}/api/query`, method: "POST" },
      { type: "http-api", name: "Distribution Map API", url: `${ORIGIN}/api/map`, method: "GET" },
      {
        type: "mcp",
        name: "mantleflow-distribution",
        transport: "stdio",
        description: "MCP server exposing get_distribution_map / compare_assets / resolve_asset.",
      },
    ],
    skills: [
      {
        name: "mantleflow-distribution",
        description:
          "Map where a Mantle RWA can actually trade, borrow, bridge, and who is gated — with sources.",
      },
    ],
    registrations: {
      erc8004: {
        chain: "eip155:5003",
        network: "Mantle Sepolia",
        identityRegistry: ERC8004.sepolia.identity,
        reputationRegistry: ERC8004.sepolia.reputation,
        agentId,
      },
    },
  };
  return NextResponse.json(card, { headers: { "cache-control": "public, max-age=300" } });
}
