# MantleFlow

**An AI research agent that maps the _distribution_ of tokenized / real-world assets on Mantle — not their issuance.**

🔗 **Live:** https://mantleflow.vercel.app — ask *"I hold $1M of MI4 — where can I exit it, and am I gated?"* and get a real, source-receipted answer from live Mantle data.

For any Mantle-native RWA or capital-market asset, MantleFlow answers in natural language:
*where can this asset actually be bought, sold, borrowed against, and bridged — and who is gated from
holding it?* It surfaces secondary-market reachability, liquidity depth & fragmentation, lending
venues, cross-chain routes, and compliance gates: the concrete frictions between issuance and global
markets. This embodies the Mantle Research Challenge thesis — *distribution is the harder problem
than issuance* — and Mantle's self-positioning as "the distribution layer for onchain finance."

## Why it's different
Not a "chat with Mantle TVL" wrapper. The moat is the **Distribution Score engine** + the
distribution-reachability lens + the full agent-native stack (Mantle **AI Agent Skill** + **ERC-8004**
identity/reputation + **x402/QuestFlow** monetization), all reading **real Mantle data**, every number
carrying a **source receipt** (where it came from, when, fact vs estimate).

## The Distribution Score (per asset, each sub-score sourced & drillable)
1. Secondary-market reachability · 2. Liquidity depth (±2% of mid) · 3. Fragmentation (HHI) ·
4. Borrowability · 5. Cross-chain reach · 6. Compliance gating (transfer-agent / allowlist hooks).
A finding of *"no secondary market"* or *"holder is gated"* is a headline result, not a gap.

## Monorepo
```
/agent      TS core: orchestrator, data adapters, Distribution Score engine, x402, ERC-8004 client
/web        Next.js (App Router) + Tailwind + shadcn/ui — UI + HTTP API (Vercel)
/mcp        MCP server exposing the agent's tools to any agent
/contracts  Foundry (only when we deploy)
/skill      the Mantle AI Agent Skill (SKILL.md wrapping the MCP server)
/docs       VERIFIED.md (fact ledger), DECISIONS.md, RESEARCH.md (writeup)
```

## Status — all four Mantle agent primitives live, reading real data
- **Distribution Score engine** over 6 assets (MI4, mETH, cmETH, fBTC, USDe, USDY): reachability,
  liquidity depth (±2% exact for CPMM, labelled TVL proxy elsewhere), HHI fragmentation,
  borrowability (Lendle, on-chain), cross-chain (LayerZero OFT + CCIP), compliance gating — every
  datum source-receipted, the composite labelled with exactly which sub-scores it includes.
- **AI Agent Skill** (the bonus) — `skill/mantleflow-distribution/` (open `SKILL.md` format) wrapping
  the **MCP server** (`/mcp`, stdio).
- **ERC-8004 identity** — **registered on Mantle mainnet as agentId `141`** (dual-network; topic0
  parity confirmed via a live attest→verify round-trip, D23); the live site reads it once
  `ERC8004_NETWORK`/`AGENT_ID` are set on Vercel (Sepolia #309 until then). Per-analysis provenance
  via `Identity.setMetadata` (content-addressed `keccak256` receipts, tx-receipt-verifiable); genuine
  third-party reputation (visitors rate from their own wallet — self-rating is forbidden on-chain).
- **x402 pay-per-query live** — real HTTP 402 + EIP-3009 `transferWithAuthorization`, self-settled
  on-chain (testnet tmUSD, gasless buyer via server faucet); gates `/api/query` only, all browsing
  free; QuestFlow facilitator + mainnet USDC pluggable via env.

Headline findings (live): **MI4** is GATED (Securitize allowlist — must be approved) with **no on-chain
secondary venue** — issued but undistributed; **none of the six tracked assets has a genuine secondary
*trading* venue on Mantle** (they sit in yield/lending — measured by classifying AMM vs single-asset
pools); compliance resolves into **three tiers** — MI4 gated, **mETH/cmETH/fBTC/USDY BLOCKABLE**
(blocklist/sanctions controls, surfaced for the first time), only **USDe fully open**; **mETH**'s Lendle
reserve is **FROZEN** (borrowability scored accordingly, not by raw LTV); **RWAs bridge by LayerZero OFT
or not at all** (cmETH/USDe verified, none on Mantle's CCIP set); **syrupUSDT left Mantle**. Full writeup:
[`docs/RESEARCH.md`](docs/RESEARCH.md) · checklist: [`docs/DEMO_CHECKLIST.md`](docs/DEMO_CHECKLIST.md).
Fact ledger: [`docs/VERIFIED.md`](docs/VERIFIED.md) · decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Accuracy discipline
Every displayed number is traceable to a primary source with a timestamp. See `docs/VERIFIED.md`.
Verified facts are distinguished from estimates and assumptions throughout the UI and the writeup.

## Develop
```bash
pnpm install
pnpm test        # vitest across packages
pnpm typecheck
```
