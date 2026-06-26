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

## Status
**Phase 1 complete & deployed** (the MI4 vertical slice, live on Vercel). The agent reads live
Mantle data via a DeepSeek tool-use loop and returns the headline thesis result for MI4: **no
on-chain secondary venue** + a **Securitize DS-Token transfer-agent gate**, every datum
source-receipted. Phase 0 verification gate is locked in `docs/VERIFIED.md` / `docs/DECISIONS.md`.
Next: Phase 2 breadth (mETH/cmETH, fBTC, USDe, USDY, syrupUSDT) + depth/fragmentation/borrowability.

## Accuracy discipline
Every displayed number is traceable to a primary source with a timestamp. See `docs/VERIFIED.md`.
Verified facts are distinguished from estimates and assumptions throughout the UI and the writeup.

## Develop
```bash
pnpm install
pnpm test        # vitest across packages
pnpm typecheck
```
