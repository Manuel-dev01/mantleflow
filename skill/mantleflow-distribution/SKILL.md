---
name: mantleflow-distribution
description: >-
  Map the on-chain DISTRIBUTION (not issuance) of a tokenized / real-world asset on Mantle - where
  it can actually be bought, sold, borrowed against, and bridged, and exactly who is gated from
  holding it. Use this whenever a user asks about secondary-market reachability, liquidity depth or
  fragmentation, borrowability/collateral, compliance gating (transfer-agent allowlists, blocklists),
  or exit routes for ANY Mantle token - a curated RWA (MI4, mETH, cmETH, fBTC, USDe, USDY) or any 0x
  contract address (analyzed live on-chain, mainnet or Sepolia). Returns
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

## Featured assets (any Mantle token also works)

Curated / featured: `MI4` (Mantle Index Four - Securitize-gated), `mETH`, `cmETH`, `fBTC`, `USDe`, `USDY`.
Any other Mantle token can be analyzed by contract address (mainnet or Sepolia): it is read live on-chain,
labelled *uncurated* (issuer/context unverified), and given a heuristic RWA classification. MantleFlow is
RWA-focused, so non-RWA tokens are flagged, not blocked.

## The Distribution Score (sub-scores, each sourced)

1. **Reachability** - does a live secondary venue exist? (+ the venue list)
2. **Liquidity depth** - USD tradeable within ±2% of mid + $250k clearing slippage: exact from on-chain
   reserves where available, otherwise a labelled CPMM estimate from GeckoTerminal pool reserves.
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
| `list_tracked_assets` | the curated featured assets |
| `resolve_asset(query, network?)` | resolve a symbol / name / 0x address → asset (with a curated flag) |
| `get_distribution_map(symbol, network?)` | the full sourced map for ANY Mantle token (curated symbol or 0x address) |
| `compare_assets()` | every featured asset, ranked |
| `get_agent_identity()` | the agent's ERC-8004 identity (Mantle mainnet #141 / Sepolia #309) |

Start it: `npx tsx mcp/src/server.ts` (see `mcp/README.md` for the Claude Desktop config). The same
capability is live at `https://mantleflow.vercel.app` (`POST /api/query`, `GET /api/map?symbol=` or `?address=`).

## Agent-native provenance

MantleFlow holds an **ERC-8004 identity** (registered on Mantle mainnet, agentId #141; prior Sepolia #309)
and can write a **provenance receipt** for any result by stamping `keccak256(canonicalJSON(map))` into its
own identity metadata via `Identity.setMetadata` - tamper-evident and independently verifiable later, not a
self-score. See `references/distribution-score.md`.
