# PROJECT BRIEF — Mantle RWA Distribution Router & Scanner ("MantleFlow")

## 0. ROLE & MISSION
You are the lead engineer building a competition-winning entry for the **Mantle Research Challenge, Track 2 (The Research Agent)**. Deadline: **July 3, 2026**. The goal is the #1 spot. Judging axes: **quality, accuracy, originality, depth of research**. Bonus points are explicitly awarded for **using Mantle's AI Agent Skills**.

We are building an **AI research agent that maps the *distribution* of tokenized/real-world assets on Mantle** — not their issuance. For any Mantle-native RWA or capital-market asset, it answers in natural language: *where can this asset actually be bought, sold, borrowed against, bridged, and who is gated from holding it?* It surfaces secondary-market reachability, liquidity depth/fragmentation, lending venues, cross-chain routes, and compliance gates — the concrete frictions between issuance and global markets.

This directly embodies the challenge's thesis ("distribution is the harder problem than issuance") and Mantle's own self-positioning as **"the distribution layer for real-world assets."**

## 1. NON-NEGOTIABLE OUTCOMES (what "winning" requires)
1. A **live, publicly accessible deployed tool** (URL the judges can open) with at least **one fully working live example** of a real query returning real on-chain Mantle data.
2. The agent is packaged and registered as a **Mantle AI Agent Skill** (this is the bonus — treat it as mandatory, not optional).
3. The agent holds an on-chain **ERC-8004 identity** on Mantle, and accrues reputation/validation as it serves queries.
4. **x402 pay-per-query** monetization (via Mantle's QuestFlow integration) gating premium/deep queries in stablecoin.
5. A **research writeup + demo video** framing every feature around the distribution thesis, with all figures sourced and dated.
6. Code is public (GitHub), clean, documented, and reproducible — a judge must be able to follow "how you built it."

## 2. VERIFIED GROUND TRUTH (confirmed via primary/secondary sources — trust these)
- **Mantle's four live agent primitives (shipped Q1 2026):** (a) **ERC-8004** for agent identity, (b) **AI Agent Skills**, (c) **Agent Scaffold**, (d) **x402 payments via QuestFlow**. All confirmed live on Mantle.
- **ERC-8004** is backwards-compatible and works alongside **MCP**, **A2A** (Agent-to-Agent), and the **x402** payment standard. It provides agent **identity + reputation + validation** registries.
- **Mantle Sepolia testnet:** Chain ID **5003**, RPC `https://rpc.sepolia.mantle.xyz`, faucet `https://faucet.sepolia.mantle.xyz`, explorer family `explorer.sepolia.mantle.xyz` / mantlescan. Gas token: **MNT**. WebSocket pattern: `wss://ws.sepolia.mantle.xyz` (verify).
- **Mantle mainnet:** Chain ID **5000**, RPC `https://rpc.mantle.xyz`, explorer `explorer.mantle.xyz`.
- **Real Mantle RWA / capital-market assets to support (verified live):** **MI4** (Mantle Index Four, tokenized index, Securitize transfer agent), **mETH / cmETH** (LST/LRT), **fBTC** (Function BTC), **Ethena USDe**, **Ondo USDY**, **Maple Finance syrupUSDT** (deployed via Aave on Mantle, ~$90.1M TVL Q1 2026), **xStocks** (tokenized equities). Mantle RWA TVL was **$247.5M, +27.4% QoQ in Q1 2026** (Messari). Mantle treasury **$4B+**.
- **DeFi venues on Mantle for distribution mapping:** DEXs (Merchant Moe, Agni, FusionX, Butter aggregator), lending (Lendle, INIT Capital, Aave on Mantle), oracles (Pyth, API3, Redstone, Chainlink + CCIP for cross-chain).
- **Data APIs available free/cheap:** DefiLlama (TVL/yields/pools + public MCP server), Mantlescan API (Etherscan-family, contract/balance/tx reads), The Graph / Goldsky subgraphs on Mantle.

## 3. PHASE 0 — VERIFICATION GATE (DO THIS FIRST, before writing architecture-dependent code)
The following are the highest-risk unknowns. **Do NOT scaffold contracts or the Skill until each is confirmed from a PRIMARY source.** For each item below: fetch the source, record the exact answer in `docs/VERIFIED.md` with the URL and date, and only then proceed. If a source is unreachable, flag it explicitly and propose the fallback noted.

1. **AI Agent Skills — exact format & registration.** Read the official challenge page, the Mantle Cookbook/docs (`docs.mantle.xyz`), and any Mantle GitHub (`github.com/mantlenetworkio` and the Agent Scaffold repo). Determine concretely: Is a "Mantle AI Agent Skill" the open Anthropic `SKILL.md` format (folder + SKILL.md + scripts), an MCP server, or a Mantle-specific registry submission? **What exactly must I produce/register to earn the bonus?** Record the precise spec. → *Fallback if unclear: implement as a standard `SKILL.md`-format skill that wraps our MCP server, AND register per whatever Mantle's Agent Scaffold documents.*
2. **ERC-8004 registry contract addresses on Mantle (mainnet + Sepolia)** and their ABIs — Identity Registry, Reputation Registry, Validation Registry. Find the deployed addresses and the exact function signatures for `register`, writing an AgentCard URI, and submitting feedback/validation. → *Fallback: use the canonical ERC-8004 reference implementation contracts and deploy our own instance to Sepolia, documenting that choice.*
3. **x402 via QuestFlow — integration path.** Find QuestFlow's x402 facilitator docs: the 402 challenge schema, the settlement stablecoin on Mantle (USDC vs USDe vs mUSD), facilitator endpoint, and the client-side payment-payload flow (EIP-3009 `transferWithAuthorization` expected). → *Fallback: implement standard x402 (Coinbase spec) against the documented Mantle facilitator; if no live facilitator, implement the full 402 handshake against our own minimal facilitator on Sepolia and document it.*
4. **Challenge submission mechanics & any judge-specified rubric** — re-read the official brief and the Typeform for any format requirements (so we build to spec).

Output of Phase 0: a completed `docs/VERIFIED.md` and a one-paragraph "architecture is now locked" confirmation. **Stop and show me this before Phase 1.**

## 4. ARCHITECTURE (lock after Phase 0)
- **Monorepo.** `/contracts` (Foundry, Solidity), `/agent` (Go backend — agent orchestration, data adapters, MCP/Skill server, x402 middleware), `/web` (Next.js + Tailwind frontend, deploy Vercel), `/skill` (the Mantle AI Agent Skill package), `/docs`.
- **Agent core (Go):** an orchestration layer that takes an NL query → plans → calls data adapters → composes a "distribution map" → returns structured JSON + NL answer. LLM calls via Anthropic API (Claude). Expose as: (a) an HTTP/JSON API, (b) an **MCP server** so any agent can call it, (c) wrapped as the **Mantle AI Agent Skill**.
- **Data adapters (Go):** DefiLlama (TVL/pools/yields), Mantlescan (on-chain reads, token holders, contract ABIs), subgraph adapters for Merchant Moe/Agni/Lendle/Aave-on-Mantle (pool depth, reserves, rates), oracle reads (Pyth/Redstone) for pricing, Chainlink CCIP lane availability for cross-chain routes. Cache aggressively; rate-limit-aware.
- **The "Distribution Score" engine** (this is our original IP — make it rigorous, not hand-wavy): for each asset compute and explain (1) **secondary-market reachability** (is there a live secondary venue at all?), (2) **liquidity depth** (USD depth at ±2% from mid across venues), (3) **fragmentation index** (Herfindahl-Hirschman across venues/chains), (4) **borrowability** (lending markets + collateral factor + utilization), (5) **cross-chain reach** (which CCIP/bridge routes exist, est. cost/slippage to exit $X to chain Y), (6) **compliance gating** (does the token contract have transfer restrictions / allowlists / transfer-agent hooks — detect via bytecode/ABI inspection and known issuer patterns). Each sub-score must be explainable with the underlying numbers and source.
- **Contracts (Foundry, Sepolia first):** ERC-8004 identity registration for our agent + reputation/validation writes on query completion; any minimal x402 settlement helper if QuestFlow requires it. 100% test coverage on anything we author.
- **x402 middleware (Go):** free tier = basic asset lookup; **paid tier** (deep distribution map, cross-chain route optimization, compliance report) returns HTTP 402 with the QuestFlow-compatible challenge, verifies the `X-PAYMENT` header, settles, then serves.

## 5. THE ONE LIVE EXAMPLE (must work end-to-end for judging)
Scripted demo flow, real data, on Mantle: a user (or an agent) asks *"I hold $1M of MI4 — where can I exit it, how deep is secondary liquidity, what can I borrow against it, and what's the cheapest route to move it to another chain?"* The agent: charges via x402, reads live Mantle data, returns a distribution map with real depth/fragmentation/borrow/route/compliance numbers, and writes an ERC-8004 reputation attestation. Build this exact path first as a vertical slice.

## 6. STAGED PLAN (≈18 days; show me a checkpoint at each phase end)
- **Phase 0 (Day 0–1):** Verification gate above. Lock architecture.
- **Phase 1 (Day 1–3):** Vertical slice — Go agent + DefiLlama + Mantlescan adapters; Distribution Score for **MI4 only**; Next.js page live on Vercel showing it. No payments/identity yet.
- **Phase 2 (Day 4–7):** Breadth — add mETH/cmETH, fBTC, USDe, USDY, syrupUSDT. Add subgraph depth + fragmentation + borrowability sub-scores. Harden adapters.
- **Phase 3 (Day 7–10):** Package and register the **Mantle AI Agent Skill** (the bonus) + ship the **MCP server**. Deploy **ERC-8004** identity on Sepolia, publish AgentCard, wire reputation writes.
- **Phase 4 (Day 10–13):** **x402 / QuestFlow** pay-per-query. Cross-chain route + compliance-gate modules. Record the live example.
- **Phase 5 (Day 13–16):** Research writeup (distribution thesis, every figure sourced+dated), demo video, README "how you built it," polish UI per Mantle brand.
- **Phase 6 (Day 16–18):** Accuracy pass (re-verify every number), mainnet deploy if stable, submit via Typeform + X post tagging @Mantle_Official, polish.

## 7. ENGINEERING STANDARDS
- Go: `pgx/v5`, `chi`, `sqlc` if DB needed; structured logging; context-aware; table-driven tests.
- Solidity: Foundry, comprehensive tests, no unaudited external calls in critical paths.
- Next.js: App Router, TypeScript, Tailwind, shadcn/ui; deploy Vercel; mobile-responsive.
- **Accuracy is a judging axis:** never display a number without a traceable source and timestamp. Build a "source receipt" into every data point in the UI.
- Every external claim in the writeup must cite a primary source with a date. Distinguish verified facts from estimates.
- Commit in small atomic units; keep `docs/VERIFIED.md` and `docs/DECISIONS.md` current.

## 8. ORIGINALITY GUARDRAILS (what would make us LOSE — avoid)
- Do NOT build a generic "chat with Mantle TVL" or a DefiLlama/Dune wrapper. The distribution-reachability lens + the Distribution Score engine + the full agent-native primitive stack (Skill + ERC-8004 + x402) is the moat.
- Do NOT fake the live example or hardcode results. Judges reward real on-chain reads.
- Do NOT skip the AI Agent Skills registration — it's free bonus points most entrants will miss.

## 9. FIRST ACTION
Begin **Phase 0**. Produce `docs/VERIFIED.md`, resolve the four verification items from primary sources, then stop and present the locked architecture for my approval before Phase 1.