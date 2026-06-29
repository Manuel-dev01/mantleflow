# @mantleflow/mcp

MCP server (stdio) exposing MantleFlow's distribution-mapping capabilities as tools, so any agent
can ask where a tokenized asset on Mantle can actually trade, borrow, bridge, and who is gated -
every datum carrying a source receipt.

## Tools

| Tool | Args | Returns |
|---|---|---|
| `list_tracked_assets` | - | tracked symbols |
| `resolve_asset` | `query` | matched tracked asset (or null) |
| `get_distribution_map` | `symbol` | live `DistributionMap` (6 sub-scores, sourced) |
| `compare_assets` | - | every asset's map, for the leaderboard |
| `get_agent_identity` | - | ERC-8004 registry coords + agentId |

## Run

```bash
pnpm -C mcp start          # or: npx tsx mcp/src/server.ts
```

Requires the same env as the web app (`ETHERSCAN_API_KEY`, `MANTLE_MAINNET_RPC`, …) - copy
`web/.env.local` to `mcp/.env`, or export them.

## Connect from Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mantleflow": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mantleflow/mcp/src/server.ts"],
      "env": { "ETHERSCAN_API_KEY": "…", "MANTLE_MAINNET_RPC": "…" }
    }
  }
}
```

Then ask Claude: *"Use mantleflow to map the distribution of MI4 on Mantle."*

This server is wrapped by the **MantleFlow AI Agent Skill** at `skill/mantleflow-distribution/`.
