# /mcp — MantleFlow MCP server (Phase 3)

A thin Model Context Protocol server (stdio + HTTP) exposing `@mantleflow/agent` tools — e.g.
`get_distribution_map`, `score_asset`, `find_secondary_venues`, `check_compliance_gate` — so any
agent can call MantleFlow. Built on `@modelcontextprotocol/sdk`. The `/skill` package wraps this.
