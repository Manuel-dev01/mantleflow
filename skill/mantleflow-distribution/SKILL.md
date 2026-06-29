---
name: mantleflow-distribution
description: >-
  Map the on-chain DISTRIBUTION (not issuance) of a tokenized / real-world asset on Mantle - where
  it can actually be bought, sold, borrowed against, and bridged, and exactly who is gated from
  holding it. Use this whenever a user asks about secondary-market reachability, liquidity depth or
  fragmentation, borrowability/collateral, compliance gating (transfer-agent allowlists, blocklists),
  or exit routes for a Mantle RWA / capital-market asset (MI4, mETH, cmETH, fBTC, USDe, USDY). Returns
  a Distribution Score map in which every number carries a source receipt (source + timestamp). Do not
  use it for token issuance, price prediction, or chains other than Mantle.
license: MIT
metadata:
  version: "0.1.0"
  chain: mantle
  thesis: distribution-over-issuance
---

# MantleFlow - RWA Distribution Mapping (Mantle)

## What this skill does

Issuance is easy; **distribution** is the hard problem. For any tokenized asset on Mantle this skill
answers, from **live on-chain data**: where can it be bought/sold (secondary venues), how deep and
how fragmented is its liquidity, what can you borrow against it, and **who is walled out from holding
it** (compliance gates). It returns a **Distribution Score** decomposed into sourced sub-scores -
never a black-box number.

## When to use it

Trigger on questions like:
- "Where can I sell **MI4** on Mantle, and am I gated?"
- "How deep is **mETH** liquidity? What clears a $250k exit?"
- "What lends against **fBTC**? Is **USDY** freely transferable?"
- "Compare the distribution of every Mantle RWA."

Do **not** use it for: token minting/issuance mechanics, price forecasts, or non-Mantle chains.

## Tracked assets

`MI4` (Mantle Index Four - Securitize-gated), `mETH`, `cmETH`, `fBTC`, `USDe`, `USDY`.

## The Distribution Score (sub-scores, each sourced)

1. **Reachability** - does a live secondary venue exist? (+ the venue list)
2. **Liquidity depth** - USD tradeable within ±2% of mid (exact on constant-product pools) + real
   $250k clearing slippage.
3. **Fragmentation** - Herfindahl–Hirschman Index across venues.
4. **Borrowability** - Lendle collateral factor / rates / utilization.
5. **Compliance gating** - the detected on-chain mechanism (e.g. Securitize DS-Token allowlist,
   ERC-1404, blocklist). An absence of a market or a holder gate is a *headline finding*, not a gap.
6. **Cross-chain reach** - verified bridge channels (LayerZero OFT / Chainlink CCIP); reported as
   insufficient-data when no channel is verified.

## Accuracy invariant

Every datum carries a **source receipt** (`sourceName`, `url`, `observedAt`, `kind: fact|estimate|
assumption`). The skill never emits a number it cannot trace. Treat any field without a receipt as
absent.

## How to invoke

This skill wraps the **MantleFlow MCP server** (`@mantleflow/mcp`, stdio). Tools:

| Tool | Use |
|---|---|
| `list_tracked_assets` | discover supported symbols |
| `resolve_asset(query)` | map NL → a tracked symbol |
| `get_distribution_map(symbol)` | the full sourced map for one asset |
| `compare_assets()` | every asset, ranked |
| `get_agent_identity()` | the agent's ERC-8004 identity (Mantle Sepolia) |

Start it: `npx tsx mcp/src/server.ts` (see `mcp/README.md` for the Claude Desktop config). The same
capability is live at `https://mantleflow.vercel.app` (`POST /api/query`, `GET /api/map?symbol=`).

## Agent-native provenance

MantleFlow holds an **ERC-8004 identity** on Mantle Sepolia and can write a **provenance receipt**
for any result - an on-chain commitment (`feedbackHash`) to the exact Distribution Score map, so a
result can be independently verified later. See `references/distribution-score.md`.
