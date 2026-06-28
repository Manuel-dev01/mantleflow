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

### D16 — Provenance via identity metadata, not self-reputation (confirmed on-chain)
**Date:** 2026-06-27. **Status:** locked.
An agent auto-writing its own reputation would read as faked — and the deployed Mantle-Sepolia
Reputation registry **enforces this**: `giveFeedback` about your own agentId **reverts with
"Self-feedback not allowed"** (confirmed live via `simulateContract`, so no gas wasted). Good design.
So provenance uses the **Identity registry's `setMetadata`** instead: each completed analysis stamps
**`keccak256(canonicalJSON(map))`** as the metadata KEY into the agent's OWN identity (owner-
authorized), with the value = `{symbol, uri, endpoint, at}`. It's a tamper-evident, content-addressed
record of work done — anyone can recompute the map, hash it, and find the matching `MetadataSet`
event (`agentId` + `keccak(key)` indexed). NOT a score. **User-triggered** ("Attest result on-chain").
Reputation stays reserved for genuine third-party feedback. (`agent/src/erc8004/client.ts`,
`web/app/api/attest`.)

### D17 — MCP transport = stdio; packaged as an Anthropic SKILL.md skill
**Date:** 2026-06-27. **Status:** locked.
The agent ships as `@mantleflow/mcp` (a stdio MCP server over `createCapabilities`, tools
`get_distribution_map`/`compare_assets`/`resolve_asset`/`list_tracked_assets`/`get_agent_identity`)
wrapped by the open `SKILL.md` skill at `skill/mantleflow-distribution/` — the standard skills path
(Claude Desktop / CLI). No hosted HTTP/SSE endpoint this phase (Phase 4+).

### D18 — Agent identity on Mantle Sepolia; write ABI confirmed by simulation
**Date:** 2026-06-27. **Status:** locked.
ERC-8004 identity + provenance writes run on **Mantle Sepolia** (D2, D4). The deployed registries'
write selectors are confirmed via on-chain `simulateContract` before broadcast (D6) since the
explorer ABI API was unavailable; the ABI itself is the EIP-8004 spec (primary source). The signing
key (`AGENT_PRIVATE_KEY`) is **testnet-only**, lives only in gitignored env + Vercel (encrypted), and
the whole app degrades gracefully (identity "pending", attest 501) when it is absent.

### D19 — Provenance verify by tx-receipt decode (reliable, tx-hash-bound)
**Date:** 2026-06-27. **Status:** locked.
The dropped read-back failed because the RPC caps `eth_getLogs` at ~10k blocks and `getMetadata`
returns empty on this deployment. Reliable verification = decode the attest **tx receipt**
(`getTransactionReceipt`, unbounded): confirm a `MetadataSet` log from the Identity registry with
`topic1 = agentId` and `topic2 = keccak256(resultHash)` (`metadataLogMatches`). Surfaced as
`verified` on `/api/attest` and a standalone `GET /api/verify?tx=&hash=` ("anyone can check"). Honest
bound: verification needs the tx hash (shown in the UI); we don't scan full history.

### D20 — Third-party reputation via the visitor's own browser wallet (no self-rating)
**Date:** 2026-06-27. **Status:** locked.
The Reputation registry forbids self-feedback, so reputation must come from a different address. A
visitor connects their OWN Sepolia wallet (`web/lib/wallet.ts`, minimal `window.ethereum` + viem —
no wagmi) and signs `giveFeedback(agentId,…)` themselves (`RateAgent`). Reads are genuine: scan
recent `Feedback` events (chunked under the 10k-block cap) → distinct raters → `getSummary` for the
aggregate. Self-rating is impossible, so any displayed count is real third-party reputation.

### D21 — Cross-chain reach: verified channels only (CCIP + LayerZero OFT), cost not quoted
**Date:** 2026-06-27. **Status:** locked.
Cross-chain is now **computed** from two sourced signals: LayerZero OFT (on-chain `endpoint()` ==
LZ V2 endpoint — detects cmETH, USDe) and Chainlink CCIP membership (Mantle's CCIP token set is
LINK/USDC/USDT/wstETH/W0G — no RWAs). We score only verified routes; when none are verified the
sub-score is **insufficient-data** (excluded from composite), never a false 0 — issuer-specific
bridges we don't probe aren't claimed either way. Per-tx bridge fees are dynamic → "not quoted"
(never fabricated). The composite now includes cross-chain (weight 0.15) when computed, with a
self-describing note listing exactly which sub-scores were included.

### D22 — x402: Sepolia tmUSD self-settle, gate /api/query only, pluggable QuestFlow/mainnet
**Date:** 2026-06-27. **Status:** locked.
QuestFlow's facilitator is live on Mantle but its API key is gated behind an application form, and
mainnet USDC = real money + judges holding USDC. So the live x402 demo is **unblocked + judge-
friendly**: we deployed a minimal **EIP-3009 test stablecoin (tmUSD,
`0x246e485a5966b19871f3e9297182f8cb49fd8242`)** on Mantle Sepolia with a public faucet, and
**self-settle** — the server (agent wallet) submits the buyer's signed `transferWithAuthorization`,
paying gas; a server-funded `/api/faucet` mints tmUSD to the buyer so the buyer needs **zero MNT and
zero real money** and only signs (gasless). Genuine x402: HTTP 402 + EIP-3009 "exact" scheme + real
on-chain settlement; only the asset/network differ from mainnet, by config. **Gate `/api/query` (the
LLM deep-dive) only**; `/api/map`, the workspace, compare, identity, attest stay **free**. QuestFlow
facilitator + mainnet USDC are **pluggable via env** (`QUESTFLOW_API_KEY`, `X402_NETWORK`). When x402
is disabled (env unset) the query runs free — `main` stays deployable. The testnet token is clearly
labelled; every settlement tx is real + explorer-verifiable.

### D23 — Dual-network: ERC-8004 identity → mainnet, x402 stays Sepolia
**Date:** 2026-06-27. **Status:** locked (capability); registration pending mainnet funding.
The agent's **ERC-8004 identity + provenance + reputation move to Mantle mainnet (5000)** for the
strongest verifiable identity (judges check explorer.mantle.xyz); **x402 pay-per-query stays on Mantle
Sepolia (5003)** with tmUSD + the gasless faucet (judge-friendly, no real money — D22). These are two
independent env knobs: `erc8004Network` (new) and `x402Network`. The SAME `AGENT_PRIVATE_KEY` signs
both — viem binds chain per client, so the mainnet ERC-8004 writer and the Sepolia x402 settler are
independent (per-chain nonces); no collision. Implementation: `walletClientFor(network,…)` generalises
`walletClientForSepolia` (kept as a shim so x402/faucet are untouched); `createErc8004Reader/Writer`
resolve registries/RPC/explorer/labels from `erc8004Network`; `metadataLogMatches` takes the identity
registry as a param; the AgentCard + `/api/agent` + browser wallet (`connect(network)`) + RateAgent all
derive their network from config/the live card. **Default is `sepolia`** so the live deployment never
breaks before a mainnet agentId exists; the move completes by (1) funding the agent wallet with real
mainnet MNT, (2) registering a NEW mainnet agentId (`ERC8004_NETWORK=mainnet` register script, AGENT_ID
unset), (3) setting `ERC8004_NETWORK=mainnet` + the new `AGENT_ID` on Vercel. **Verification gate
before trusting mainnet reads:** confirm the mainnet registries emit the same `MetadataSet`/`Feedback`
topic0 as Sepolia (a live register→attest→verify→getSummary round-trip) — a different impl would make
reads silently empty. Full mainnet x402 in real USDC was explicitly NOT chosen (judges can't easily
test it).

### D24 — Reachability counts genuine SWAP venues only; yield/vault positions surfaced separately
**Date:** 2026-06-27. **Status:** locked.
The reachability + depth + fragmentation sub-scores previously counted **every** DefiLlama pool as a
"secondary venue", inflating venue count and depth with single-asset yield/lending/vault positions you
**cannot sell into** (e.g. woofi-earn, circuit-protocol, aave-v3). Fix: classify each venue
swap-vs-yield via `classifyLlamaPool` — primary signal the DefiLlama **`exposure`** field (`multi` = a
2-sided AMM/trading pool ⇒ swap; `single` = a single-asset deposit ⇒ yield), with a DEX-project
allowlist as a fallback when exposure is absent (verified against live Mantle data 2026-06-27: only
`fluxion-network` is `multi`; everything else is `single`). On-chain `getPair` venues are always swap.
**Only swap venues count** toward reachability/depth/fragmentation totals; yield venues are kept in the
drill-down inputs and shown in a separate, clearly-labelled UI row. `noSecondaryMarket` now means "no
genuine trading venue (via probed venues)". This is more accurate and more on-thesis: every tracked
RWA/LST currently shows **no genuine secondary trading venue** on Mantle (they sit in yield/lending),
which is the distribution thesis made concrete. The "no trading venue" claim is always scoped to the
venues we probe (Merchant Moe v2 + DefiLlama AMM pools), never an absolute.

### D25 — Borrowability penalises a FROZEN Lendle reserve
**Date:** 2026-06-27. **Status:** locked.
A frozen Aave-v2/Lendle reserve cannot be supplied or borrowed against, so practical borrowability is
near-zero — yet the score previously ignored `isFrozen` and returned the LTV-derived value (mETH read
~91 while its reserve was FROZEN, contradicting the Gates-tab warning). Fix: when `isFrozen`, the
borrowability sub-score returns a low value (**20**) and an explanation that leads with "reserve FROZEN
— supply/borrow halted". The score now agrees with the on-chain frozen flag the UI already surfaces.
