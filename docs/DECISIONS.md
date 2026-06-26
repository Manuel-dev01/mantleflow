# DECISIONS.md — MantleFlow Architecture Decision Log

> Consequential, durable decisions and their rationale. Keep current as we go.
> Last updated: **2026-06-25**.

---

### D1 — Backend stack: TypeScript end-to-end (overrides the brief's Go mandate)
**Date:** 2026-06-25. **Status:** locked.
The brief specified Go for `/agent`. Decision reversed by the project owner after Phase 0
verification: every agent-native primitive we MUST demo (MCP server, x402 client signing via
EIP-3009, ERC-8004 reads/writes, Anthropic SDK) has first-class TypeScript support and thinner Go
support, and the web app is already TS/Next.js. The moat (Distribution Score engine) is
language-agnostic and the deadline is non-binding, so we optimize for fewest integration unknowns.
**Stack:** viem (Mantle reads/writes), Anthropic TS SDK (LLM), `@modelcontextprotocol/sdk` (MCP),
x402 TS packages + QuestFlow facilitator, Zod (validation), Vitest (tests). Foundry only if we
deploy a contract.

### D2 — Network: Sepolia-first
**Date:** 2026-06-25. **Status:** locked.
Identity/reputation writes and any deploys happen on Mantle Sepolia (5003) first. Asset reads use
mainnet (5000) where the asset is mainnet-only (e.g. MI4). Mainnet writes only when stable.

### D3 — x402 settlement asset: USDC via QuestFlow facilitator
**Date:** 2026-06-25. **Status:** locked (asset), pending (schema).
Settle in USDC on Mantle (`0x09Bc…0dF9`, EIP-3009) through `facilitator.questflow.ai`. Mantle is not
a Coinbase CDP facilitator network, so QuestFlow is the path. Fallback: our own minimal x402
facilitator on Sepolia if QuestFlow access/schema blocks us.

### D4 — ERC-8004: Identity + Reputation only
**Date:** 2026-06-25. **Status:** locked.
The Validation Registry is not deployed on Mantle. Use the deployed Identity + Reputation registries
(addresses on-chain verified, VERIFIED.md §3). Revisit if validation becomes necessary.

### D5 — Accuracy invariant: SourceReceipt on every datum
**Date:** 2026-06-25. **Status:** locked.
Every externally-sourced datum is wrapped in a `SourceReceipt { sourceName, url, observedAt, kind }`
(`agent/src/types/source-receipt.ts`) and rendered in the UI. The Distribution Score engine refuses
to emit a composite without its sub-scores and their receipts. Accuracy is a judging axis, so it is
a code rule.

### D6 — Address-trust rule: verify on-chain before any write
**Date:** 2026-06-25. **Status:** locked.
No contract address is used for a write until confirmed on-chain (`eth_getCode` + a read) against a
primary explorer/RPC. The ERC-8004 registries, USDC, and MI4 in VERIFIED.md have passed this gate.

### D10 — Borrowability source: Lendle only (Phase 2)
**Date:** 2026-06-26. **Status:** locked.
Lendle (Aave-v2 fork) has confirmed Mantle addresses + a ProtocolDataProvider that returns decoded
LTV/rates/utilization — fastest path to a rigorous, real borrowability sub-score. Aave V3 + INIT
Capital deferred to a later hardening pass. Not-listed-on-Lendle is scored 0 and reported as a finding.

### D11 — Depth methodology: exact-v2 + TVL-proxy, labelled
**Date:** 2026-06-26. **Status:** locked.
Liquidity depth uses on-chain `getReserves` for Uniswap-v2 pairs (exact ±2%-of-mid USD via
constant-product) and DefiLlama pool TVL as a clearly-labelled proxy for v3 / Liquidity-Book venues
(no precise ±2% claimed there). Honest over precise — never present a TVL proxy as a ±2% depth.

### D12 — Partial composite (5/6), labelled
**Date:** 2026-06-26. **Status:** locked.
The composite is a weighted mean over *computed* sub-scores, renormalising weights, and **excludes
cross-chain** (Phase 4) with an explicit `compositeNote`. The engine still emits no number for any
not-applicable / not-yet-computed sub-score.

### D13 — DeepSeek orchestrator (supersedes D8's Anthropic choice)
**Date:** 2026-06-26. **Status:** locked.
Orchestrator LLM is **DeepSeek** (`deepseek-v4-flash`) via the OpenAI-compatible API
(`LLM_BASE_URL`), owner-supplied. Same tool-use loop + accuracy-constrained system prompt as D8.

### D8 — Orchestration: Anthropic tool-use, model claude-opus-4-8, streaming
**Date:** 2026-06-25. **Status:** locked (model), pending (loop impl).
NL demo surface is a full Anthropic tool-use orchestration (owner decision). Per the claude-api
skill, the orchestrator model defaults to **`claude-opus-4-8`** (not sonnet) with adaptive thinking
and streaming; system prompt constrains the model to only state tool-returned numbers and cite each
datum's receipt. Both keys live (Etherscan V2 + Anthropic).

### D9 — Capability functions shared by engine and agent
**Date:** 2026-06-25. **Status:** locked.
Each capability (reachability, compliance, token facts) is one deterministic function returning
`Sourced<…>` (`agent/src/capabilities.ts`, `dex/reachability.ts`, `modules/compliance.ts`). The
engine composes them into a `DistributionMap`; the orchestrator will expose the same functions as
tools. No logic duplicated between engine and agent.

### D7 — Monorepo layout
**Date:** 2026-06-25. **Status:** locked.
pnpm workspaces + Turborepo. `/agent` (TS core lib), `/web` (Next.js + API routes, Vercel),
`/mcp` (MCP server over `/agent`), `/contracts` (Foundry, only if deploying), `/skill` (SKILL.md
wrapping MCP), `/docs`. Packages join the workspace as they gain a `package.json`.

### D14 — UI: faithful brutalist design port, every panel wired to live data, honest gaps
**Date:** 2026-06-26. **Status:** locked.
The Claude Design mockup (`web/design/Mantleflow.dc.html` — black/paper/acid-green, Bricolage
Grotesque + IBM Plex) is ported to React/Tailwind: a landing site (`/`) and a two-stage app
(`/app`: ask-home + 5-tab workspace — Overview/Distribution/Liquidity/Routes/Gates). The mockup's
mock data (mTBILL/wGOLD, per-jurisdiction tables, fabricated routes/stats) is **discarded**; every
panel binds to the real `DistributionMap`. Where the backend can't source something yet it renders
an honest state, not a fabrication: **Routes** = not-yet-computed (Phase 4); **Gates** reports the
detected on-chain mechanism + evidence and explicitly omits any jurisdiction breakdown (can't be
source-verified from a contract); the **landing stat band** uses true facts (6 assets / 5 live
sub-scores / source-receipted) and the **product preview** is a live `/api/map` read of mETH with a
graceful "unavailable" shell if the read fails. Every displayed datum carries a `<SourceTag>`
receipt (accuracy is judged → receipts are a feature). New `GET /api/map?symbol=` serves no-LLM map
reads for fast asset/tab switching; `/api/query` still serves the NL answer.

### D15 — Borrowability stays Lendle-only; per-$250k slippage = constant-product, CPMM venues only
**Date:** 2026-06-26. **Status:** locked.
Added real per-order clearing slippage (`agent/src/dex/slippage.ts`): exact constant-product price
impact for a $250k exit, computed only for `cpmm-exact` venues (we hold their on-chain reserves);
TVL-proxy venues (v3 / Liquidity Book) report `null` → the UI shows "—" rather than an unsourced
number. Surfaced as the Overview "BEST SLIP / $250k" stat (min across CPMM venues) and the Liquidity
table's SLIP/250K column. No change to composite weighting.
