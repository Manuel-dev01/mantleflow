# MantleFlow

**An AI research agent that maps the _distribution_ of tokenized and real-world assets on Mantle — not their issuance.**

🔗 **Live:** https://mantleflow.vercel.app
🧪 Try it: *“I hold $1M of MI4 — where can I exit it, how deep is secondary liquidity, and am I gated?”*

For any Mantle-native RWA or capital-market asset, MantleFlow answers one question in natural language:

> Once this asset is issued, **where can it actually be bought, sold, borrowed against, and bridged — and who is gated from holding it?**

It surfaces secondary-market reachability, liquidity depth and fragmentation, lending venues, cross-chain
routes, and compliance gates — the concrete frictions between issuance and a global market. This is the
thesis of the **Mantle Research Challenge** (*distribution is the harder problem than issuance*) and of
Mantle's own positioning as “the distribution layer for onchain finance.”

---

## Why this is a research tool, not a dashboard

Most RWA tools answer the *issuance* question — how much TVL is tokenized, who minted it, what it's worth.
That half is saturated. MantleFlow answers the *distribution* question, and it treats an **absence** of
distribution as a headline finding: *“no secondary market”* and *“the holder is gated”* are not gaps in
coverage — they are the result.

Three things set it apart:

1. **The Distribution Score engine** — an original, six-axis scoring model computed entirely from sourced
   on-chain and market data, explainable down to the underlying numbers.
2. **The distribution-reachability lens** — every asset is evaluated by where it can move, not how it was minted.
3. **A full agent-native stack on Mantle** — an AI Agent Skill, an ERC-8004 on-chain identity with
   reputation, and x402 pay-per-query — all reading **real Mantle data**, every number carrying a
   **source receipt** (where it came from, when, and whether it is a fact, an estimate, or an assumption).

---

## The Distribution Score

Per asset, each sub-score is independently sourced and drillable in the UI:

| # | Sub-score | What it measures |
|---|-----------|------------------|
| 1 | **Secondary-market reachability** | Does a live on-chain venue exist at all, and where? |
| 2 | **Liquidity depth** | USD depth available within ±2% of mid, aggregated across venues |
| 3 | **Fragmentation (HHI)** | Herfindahl–Hirschman concentration of liquidity across venues |
| 4 | **Borrowability** | Lending markets accepting it as collateral — LTV, rates, frozen state |
| 5 | **Cross-chain reach** | Which bridge routes (LayerZero OFT / CCIP) actually exist |
| 6 | **Compliance gating** | Transfer-agent / allowlist / blocklist hooks detected on the token contract |

The composite is a renormalized weighted mean over **only** the sub-scores that could be computed, and is
suppressed (shown as “—”) when fewer than three are available — never a misleading “0/100.”

---

## Headline findings (live)

Distribution varies enormously across six Mantle assets — that spread *is* the research result:

| Asset | Trading venues | DEX liquidity | Composite | Compliance |
|-------|:--:|--:|:--:|------------|
| **MI4** (tokenized index) | **0** | $0 | 5 | **GATED** — Securitize allowlist (issued, undistributed) |
| **USDY** (tokenized treasury) | 20 | **~$5k** (dust) | 52 | BLOCKABLE |
| **fBTC** (omnichain BTC) | 16 | ~$1.4M | 57 | BLOCKABLE |
| **cmETH** (restaked ETH) | 20 | ~$1.9M | 66 | BLOCKABLE |
| **mETH** (liquid-staked ETH) | 20 | ~$4.3M | 69 | BLOCKABLE — Lendle reserve **frozen** |
| **USDe** (yield stablecoin) | 20 | **~$17.5M** | 77 | **OPEN** |

- **MI4 is issued but undistributed** — a permissioned (Securitize) token with no on-chain secondary venue.
- **USDY is the striking middle case** — listed on 20 pools, yet only ~$5k of real depth.
- **Compliance resolves into three tiers** — MI4 `GATED` (allowlist), mETH/cmETH/fBTC/USDY `BLOCKABLE`
  (blocklist/sanctions controls, surfaced on-chain), only USDe fully `OPEN`.
- **RWAs bridge by LayerZero OFT or not at all** — cmETH/USDe routes verified; none on Mantle's CCIP set.

Full per-asset findings: [`docs/FINDINGS.md`](docs/FINDINGS.md) · how the score works:
[`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) · how to use it: [`docs/USAGE.md`](docs/USAGE.md).

---

## Agent-native stack (all four Mantle primitives, live)

- **The agent answers for free** — a typed question runs the LLM and returns a real, data-grounded answer
  (venues by DEX + liquidity + 24h volume, borrowability, gates). The x402 premium is reserved for a
  deeper cross-asset deep-dive.
- **AI Agent Skill** — [`skill/mantleflow-distribution/`](skill/mantleflow-distribution) (open `SKILL.md`
  format) wrapping the **MCP server** ([`mcp/`](mcp), stdio) so any agent can call the engine's tools.
- **ERC-8004 identity** — registered on **Mantle mainnet as agentId `141`** (dual-network; topic0 parity
  confirmed by a live attest→verify round-trip). Per-analysis provenance via `Identity.setMetadata`
  (content-addressed `keccak256` receipts, verifiable from the tx receipt), and genuine third-party
  reputation — visitors rate from their own wallet, since self-rating is forbidden on-chain.
- **x402 pay-per-query** — real HTTP 402 + EIP-3009 `transferWithAuthorization`, self-settled on-chain
  (testnet tmUSD, gasless buyer via a server faucet). It gates only the premium deep-dive; all browsing is
  free. QuestFlow facilitator and mainnet USDC are pluggable via env.

---

## Data sources

Real Mantle state, no mocks in any path a user sees:

- **GeckoTerminal** — DEX pools, liquidity, and 24h volume across 10+ Mantle DEXs (Agni, Merchant Moe
  classic + Liquidity Book, FusionX, Cleopatra, iZiSwap, and more).
- **On-chain reads** (viem) — token facts, lending reserves (Lendle), compliance hooks, bridge contracts.
- **DefiLlama** — yield/vault positions and TVL context.

Every displayed datum carries its source and timestamp, and is labelled fact / estimate / assumption.
On-chain CPMM reserves are exact; ±2% depth and slippage derived from pool reserves are labelled estimates.

---

## Repository layout

```
/agent      TypeScript core — orchestrator, data adapters, Distribution Score engine, x402, ERC-8004 client
/web        Next.js (App Router) + Tailwind + shadcn/ui — UI and HTTP API (deployed on Vercel)
/mcp        MCP server exposing the agent's tools to any agent (stdio)
/skill      the Mantle AI Agent Skill (SKILL.md wrapping the MCP server)
/contracts  Foundry — ERC-8004 writes and x402 settlement helpers
/docs       FINDINGS.md (research results) · METHODOLOGY.md (the score) · USAGE.md (user guide)
```

## Develop

```bash
pnpm install
pnpm test         # vitest across packages
pnpm typecheck
pnpm -C web build
```

---

## Accuracy discipline

Accuracy is a first-class constraint, not a footnote. Every number displayed in the UI or stated in these
docs is traceable to a primary source with a timestamp, shown as a source receipt on every datum in the
live app (see [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md)). Facts are distinguished from estimates and
assumptions throughout. Where data is unavailable, the tool says so explicitly and frames the absence as a
finding — it never fabricates or hardcodes a result.
