# MantleFlow — Research Writeup

> **The distribution of tokenized assets on Mantle, mapped on-chain.**
> Mantle Research Challenge · Track 2 (The Research Agent).
> Live tool: **https://mantleflow.vercel.app** · Code: this repository.
> Every figure below is traceable to `docs/VERIFIED.md` (the fact ledger) with a primary
> source and a date. Facts, estimates, and assumptions are labelled distinctly throughout.
> Last updated **2026-06-27**.

---

## 1. The thesis — and why distribution, not issuance, is the research question

The Mantle Research Challenge ("Prove the Next Move in Onchain Finance", @Mantle_Official,
posted **2026-06-16**) states its own thesis verbatim:

> *"Issuing tokenized assets is only one part of the problem. The harder challenge may be
> distribution: moving capital market assets from issuance to global markets without friction,
> borders, or…"*
> — Mantle, 2026-06-16 (confirmed via the X syndication card, 2026-06-25).

Almost every RWA tool answers the *issuance* question: how much TVL is tokenized, who minted it,
what it's worth. That's the easy half and it's saturated. The **harder, unanswered** question is
distribution: once an asset is issued, **where can it actually be bought, sold, borrowed against,
and bridged — and who is gated from holding it?** Those are the real frictions between an issued
token and a global market.

MantleFlow is built to answer exactly that, on-chain, for any Mantle-native RWA or capital-market
asset, in natural language — and to treat an *absence* of distribution as the headline finding it
is. "No secondary market" and "the holder is gated" are not gaps in our coverage; they are the
research result that proves the thesis.

Context (secondary, dated): Mantle RWA TVL was **$247.5M, +27.4% QoQ in Q1 2026** (Messari,
reported 2026-06-09); Mantle positions itself as "the distribution layer for onchain finance."
The capital is arriving. The distribution rails are what we measure.

---

## 2. The Distribution Score engine — the original IP

For each asset we compute six sub-scores, each derived from sourced on-chain or first-party API
data, each drillable in the UI to the underlying numbers. The engine **never emits a sub-score it
cannot source**, and never emits a composite without showing its parts (`agent/src/engine/engine.ts`).

| # | Sub-score | What it measures | Primary source |
|---|-----------|------------------|----------------|
| 1 | **Secondary-market reachability** | Does a live on-chain secondary venue exist at all? | Merchant Moe factories (`getPair`) + DefiLlama pools |
| 2 | **Liquidity depth** | USD depth available at ±2% of mid | On-chain `getReserves` (CPMM, exact) + DefiLlama pool TVL (labelled proxy) |
| 3 | **Fragmentation (HHI)** | Herfindahl–Hirschman index of liquidity across venues | Computed over per-venue USD liquidity |
| 4 | **Borrowability** | Is it accepted as collateral? LTV, rates, utilization | Lendle `ProtocolDataProvider` (on-chain) |
| 5 | **Cross-chain reach** | Which verified bridge channels exist | LayerZero OFT `endpoint()` probe + Chainlink CCIP token registry |
| 6 | **Compliance gating** | Transfer restrictions / allowlists / transfer-agent hooks | Contract ABI/bytecode inspection (Etherscan V2) + issuer pattern match |

### How the math actually works (no hand-waving)

- **Reachability** (`engine.ts:17`): `0` if no venue found; otherwise `min(100, 25 + 25·venues)`. A
  zero here is a *finding*, with the venues checked named in the explanation.
- **Liquidity depth** (`subscores/depth.ts`): for Uniswap-v2-style pairs (Merchant Moe classic) we
  read on-chain reserves and compute the **exact** USD tradeable within ±2% of mid via the
  constant-product invariant. For v3 / Liquidity-Book venues, where we don't hold tick-level
  liquidity, we use DefiLlama pool TVL as a **clearly-labelled proxy** — we never present a TVL
  proxy as a ±2% depth (decision **D11**).
- **Per-$250k clearing slippage** (`dex/slippage.ts`, **D15**): exact constant-product price impact
  for a $250k exit, computed *only* for CPMM venues whose reserves we hold; proxy venues report
  `null` and the UI shows "—" rather than an unsourced number.
- **Fragmentation** (`subscores/fragmentation.ts`): HHI over per-venue USD liquidity shares. High =
  concentrated (one venue), low = fragmented (capital split, harder to exit size). Components shown.
- **Borrowability** (`subscores/borrowability.ts`, **D10**): Lendle (Aave-v2 fork) is the source;
  `getReserveConfigurationData`/`getReserveData` return decoded LTV / liquidation threshold / supply
  & borrow rates / utilization. Not-listed = `0`, reported as a finding.
- **Cross-chain** (`subscores/crosschain.ts`, **D21**): scored only from verified channels —
  LayerZero OFT (on-chain `endpoint()` == LZ V2 endpoint) and Chainlink CCIP membership. When no
  channel is verified, the sub-score is **insufficient-data** and is *excluded from the composite* —
  never a false zero. Per-tx bridge fees are dynamic, so cost is reported "not quoted", never fabricated.
- **Compliance** (`engine.ts:31`): `90` if no restriction hooks detected; `15` if gated, with the
  detected mechanism named (e.g. "Securitize DS-Token transfer-agent allowlist"). If Etherscan is
  unavailable, the sub-score is **insufficient-data** — we report neither gated nor ungated rather
  than guess.

### The composite is honest by construction

The composite (`engine.ts:85`) is a **weighted mean over the sub-scores that could be computed**,
renormalising the weights among those present (reachability .25, depth .20, fragmentation .15,
borrowability .20, compliance .20, cross-chain .15). Every map carries a self-describing
`compositeNote` listing exactly which sub-scores were included and which were not scored. A judge
can read, for any number, *what went into it and what didn't* (decision **D12**).

---

## 3. The accuracy discipline (accuracy is a judging axis, so it's a code rule)

Every externally-sourced datum in the system is wrapped in a **`SourceReceipt { sourceName, url,
observedAt, kind }`** where `kind ∈ {fact, estimate, assumption}` (`agent/src/types/source-receipt.ts`,
decision **D5**). The Distribution Score engine **refuses to emit a composite without its sub-scores
and their receipts**. In the UI, every displayed number carries a `<SourceTag>` popover showing
where it came from, when it was observed, and whether it's a fact or an estimate. This is a feature,
not decoration — it is how a judge audits accuracy.

The fact ledger (`docs/VERIFIED.md`) records every confirmed primitive — address, schema, figure —
as `claim — value — primary source — date`. A fact is "verified" only from a primary source (Mantle
docs/GitHub/official post, the spec, the issuer, or a direct on-chain read). News/secondary sources
are allowed for *context figures* only, and are dated and labelled as such.

---

## 4. What the agent actually found — live distribution findings

These are real results from live Mantle reads, not illustrations. Each is reproducible: open the
asset in the live tool and drill into the sub-score receipts.

### 4.1 MI4 (Mantle Index Four) — the centerpiece: issued, but barely *distributed*
`0x671642ac281c760e34251d51bc9eef27026f3b7a` (mainnet) · name "Mantle Index Four", symbol MI4,
6 decimals, totalSupply ~1.35M (on-chain, 2026-06-25). Issuer/transfer agent: **Securitize**.

- **Compliance: GATED.** The contract is a proxy following the Securitize **DS-Token** pattern; the
  compliance detector flagged a **transfer-agent allowlist** — gating functions present on the
  proxy-resolved implementation ABI (Etherscan V2, 2026-06-25). Transfers are restricted to
  permissioned wallets.
- **Reachability: NONE.** No on-chain secondary venue exists — Merchant Moe factory `getPair` for
  USDC / WMNT / USDT / WETH all return empty, and DefiLlama lists no Mantle pool (2026-06-25).

**The finding:** MI4 is a fully-issued, $1M-scale tokenized index whose *only* exit is issuer
redemption, and whose holders are an allowlist. The "I hold $1M of MI4, where can I exit?" question —
the brief's one live example — has a concrete, source-backed answer: **you can't sell it on the open
market, and you couldn't have bought it without being allowlisted.** That is the distribution thesis
proven on a single asset.

### 4.2 mETH — the counter-example: a freely-distributed asset
`0xcDA86A272531e8640cD7F1a92c01839911B90bb0` (18 decimals). On Lendle it is **accepted collateral,
LTV 82.5%, liquidation threshold 86%, utilization ~21%** (on-chain Lendle `ProtocolDataProvider`,
2026-06-26). Freely transferable, with live secondary venues. mETH shows the engine scoring a
*high*-distribution asset, so the MI4 zero isn't an artifact of a broken detector — the contrast is real.

### 4.3 Cross-chain: RWAs travel by LayerZero or not at all — never CCIP
- **LayerZero V2 endpoint on Mantle** = `0x1a44076050125825900e736c501f859c50fE728c`, confirmed via
  on-chain `endpoint()` on **cmETH** (`0xE6829d9a…e8fA`) and **USDe** (`0x5d3a1Ff2…ef34`) — both are
  LayerZero OFTs. mETH / fBTC / MI4 / USDY do **not** expose this endpoint (2026-06-27).
- **Chainlink CCIP on Mantle** carries **LINK / USDC / USDT / wstETH / W0G** — **none of our tracked
  RWAs** (CCIP REST API, `chainId=5000`, 2026-06-27).

**The finding:** the cross-chain distribution path for Mantle RWAs is LayerZero OFT-specific, asset by
asset — there is no neutral, CCIP-style RWA bridge. An asset that isn't deployed as an OFT has *no
verified canonical bridge channel at all.* That is a structural distribution gap, surfaced from two
independent on-chain/first-party sources.

### 4.4 USDY — gated by a different mechanism
Ondo USDY `0x5bE26527e817998A7206475496fDE1E68957c5A6` (18, proxy) carries a **blocklist transfer
hook** (on-chain, 2026-06-26) — a different compliance mechanism than MI4's allowlist, detected by the
same engine. Distinguishing *allowlist* (permissioned-in) from *blocklist* (permissioned-out) is a
real distribution distinction, not a single "compliant/non-compliant" bit.

### 4.5 syrupUSDT — distribution can *regress*
Maple Finance's syrupUSDT, listed in the brief as a Mantle asset (~$90.1M TVL, Q1 2026), is **no
longer on Mantle**: Maple withdrew USDT from Aave-on-Mantle ~2026-04-20 (rsETH-exploit caution). We
record this as a first-class distribution finding — *an RWA that left Mantle* — rather than silently
dropping it. Distribution is not monotonic.

---

## 5. The agent-native stack (all four Mantle primitives, all reading real data)

MantleFlow is not just a research UI; it is a first-class Mantle agent. All four of Mantle's Q1-2026
agent primitives are wired and **live**.

### 5.1 AI Agent Skill (the bonus) — `skill/mantleflow-distribution/`
Packaged in the open Anthropic **`SKILL.md`** format (the verified spec — folder + `SKILL.md` with
YAML frontmatter; agentskills.io/specification, 2026-06-25), wrapping our MCP server. Tools exposed:
`get_distribution_map`, `compare_assets`, `resolve_asset`, `list_tracked_assets`,
`get_agent_identity` (`mcp/src/server.ts`, stdio transport — decision **D17**). Any Claude
Desktop/CLI agent can install the skill and query Mantle distribution.

### 5.2 ERC-8004 identity + genuine third-party reputation — live on Mantle Sepolia
- **Registered agentId = `309`** on Mantle Sepolia (5003), agent wallet
  `0x8974881E39a5eF62214929B6CaA6EC0C6e7D47c7`, register tx
  `0x107ba4b249c7ec9794f4418c0032b4909d3edad59a0b275e06c9a31d319d5b88` (ERC-721 mint;
  `ownerOf(309)`/`tokenURI(309)` read back the wallet + the AgentCard URL). Registries (on-chain
  verified): Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation
  `0x8004B663056A597Dffe9eCcC1965A193B7388713`.
- **The AgentCard** is served at `https://mantleflow.vercel.app/.well-known/agent-card.json` — the
  exact `agentURI` registered on-chain.
- **Provenance, not self-rating** (decision **D16**): we discovered live that the deployed Reputation
  registry **forbids self-feedback** — `giveFeedback` about your own agentId reverts "Self-feedback
  not allowed" (caught by `simulateContract`, no gas wasted). That's *good* design, and it sharpened
  our honesty story: an agent can't inflate its own reputation. So on each completed analysis the
  agent stamps **`keccak256(canonicalJSON(map))`** as a metadata key into its own identity via
  `Identity.setMetadata` — a tamper-evident, content-addressed receipt of work done (sample tx
  `0x021ce501da2e2e35391fc83e99ae5f03b08e352ad5c6c09fece7294dc20ee2a4`, emits `MetadataSet`). Anyone
  can recompute the map, hash it, and find the matching event — verified by decoding the tx receipt
  (decision **D19**), which sidesteps the RPC's ~10k-block `eth_getLogs` cap.
- **Real reputation exists**: agent 309 holds a genuine rating from an *independent* wallet
  `0xf45149a47658709967D7482724C90c909DD1b751` (avg 5), tx
  `0x40ec59da35e7b01f774fd1828b899c3d7a7250fc9e903cd726567003358a6dc3`. Visitors rate the agent from
  their **own** browser wallet (decision **D20**), so any displayed count is real third-party reputation.

### 5.3 x402 pay-per-query — genuine HTTP 402 + EIP-3009, live and settled on-chain
QuestFlow's facilitator is live on Mantle but its API key is gated behind an application form
(`https://forms.gle/SRdxu8yaQYVj85Jh9`), and mainnet USDC means real money + judges needing to hold
USDC — neither is demo-friendly. So we built a **real, complete, unblocked** x402 slice (decision **D22**):

- Deployed our own minimal **EIP-3009 test stablecoin, tmUSD**
  `0x246e485a5966b19871f3e9297182f8cb49fd8242` on Mantle Sepolia (6 decimals, public faucet; deploy
  tx `0x486276b9fdc2661fe5c8d7e4313f3a92d78a1fc5afa8e1602c500b6171a86c60`; 6 Foundry tests).
- The flow is genuine x402: `POST /api/query` with no payment → **HTTP 402** + a well-formed challenge
  (`{x402Version, accepts:[{scheme:"exact", network:"eip155:5003", asset, maxAmountRequired, payTo,…}]}`).
  The buyer signs an **EIP-3009 `transferWithAuthorization`** (gasless); the server self-settles by
  submitting that signed authorization on-chain. Real settlement, explorer-verifiable; replay rejected
  on-chain. Sample self-settle tx `0xc01c89ddf1ebc10fa246e68bba442863455c8e18c6c6257088e1bb14f9e6910a`.
- A server-funded `/api/faucet` mints tmUSD to the buyer, so the buyer needs **zero MNT and zero real
  money** — they only sign. **Only `/api/query` (the LLM deep-dive) is gated**; the full workspace,
  the distribution map, compare, identity, and attest all stay **free** for judges.
- QuestFlow facilitator + mainnet USDC (`0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`, EIP-3009) are
  **pluggable via env** (`QUESTFLOW_API_KEY`, `X402_NETWORK`). With x402 disabled the query runs free,
  so `main` stays deployable. The testnet token is clearly labelled and carries no real value.

---

## 6. Architecture & how it was built (reproducible)

- **Monorepo** (pnpm workspaces + Turborepo, decision **D7**): `/agent` (TS core — orchestrator, data
  adapters, Distribution Score engine, x402, ERC-8004 client), `/web` (Next.js App Router + Tailwind,
  deployed to Vercel — UI + HTTP API), `/mcp` (stdio MCP server over the agent), `/contracts` (Foundry
  — tmUSD), `/skill` (the AI Agent Skill), `/docs` (this writeup + the ledgers).
- **TypeScript end-to-end** (decision **D1**, overriding the brief's Go mandate): every agent-native
  primitive we must demo — MCP, x402/EIP-3009 signing, ERC-8004 reads/writes, the LLM loop — has
  first-class TS support, and the web app is already TS/Next.js. The moat (the scoring engine) is
  language-agnostic. viem for all Mantle reads/writes/signing; Zod for validation; Vitest + Foundry
  for tests.
- **One capability layer, shared** (decision **D9**): each capability (reachability, compliance, token
  facts, depth, borrowability, cross-chain) is one deterministic function returning `Sourced<…>`. The
  engine composes them into a `DistributionMap`; the orchestrator exposes the *same* functions as
  LLM tools. No logic is duplicated between the engine and the agent.
- **Orchestrator**: DeepSeek (`deepseek-v4-flash`) via the OpenAI-compatible API in a tool-use loop
  (decision **D13**), with a system prompt that constrains the model to state only tool-returned
  numbers and cite each datum's receipt.
- **Address-trust rule** (decision **D6**): no contract address is used for a write until confirmed
  on-chain (`eth_getCode` + a read). Because the Mantle-Sepolia explorer ABI API was unavailable,
  every ERC-8004 write is **simulated on-chain before broadcast** (`simulateContract`) — a successful
  simulate against the deployed bytecode confirms the selector and args.

### Test & verification status
- `contracts`: 6 Foundry tests green (tmUSD transferWithAuthorization, replay, expiry, bad-sig,
  balance, mint-cap). `agent`: 41 Vitest tests green (engine sub-scores, x402 verify/encode, ERC-8004
  receipt-decode, cross-chain detection). `agent` + `web` typecheck and build clean.
- The full paid flow was smoke-tested **live against production**: 402 → faucet mint → EIP-3009 sign →
  resend with `X-PAYMENT` → 200 + real on-chain settlement + the LLM answer. `/api/map` and all
  browsing remained free.

---

## 7. Honest limitations (what we do *not* claim)

Stating these is part of the accuracy discipline — a judge should see the boundary clearly.

- **Depth on v3 / Liquidity-Book venues is a TVL proxy, not a ±2% depth.** We label it as such and
  never compute per-$250k slippage where we lack tick-level reserves (D11, D15).
- **Compliance is detected from the contract**, not from a legal opinion. We report the on-chain
  mechanism and its evidence; we deliberately omit any per-jurisdiction breakdown, because that
  cannot be source-verified from a contract (decision **D14**, the "Gates" tab).
- **Cross-chain cost is not quoted** — per-tx LayerZero/CCIP fees are dynamic. We report channel
  existence, never an invented fee. Issuer-specific bridges we don't probe are not claimed either way.
- **Identity/x402 run on Mantle Sepolia testnet**, clearly labelled; tmUSD is a valueless test token.
  Mainnet USDC + the QuestFlow facilitator are env-switchable, pending the gated facilitator key.
- **The Research Challenge's own rubric/submission page** was not web-indexed at build time
  (`VERIFIED.md` §6.1); the writeup is built to the brief's stated judging axes (quality, accuracy,
  originality, depth) and the four non-negotiable outcomes.

---

## 8. Why this wins on the judging axes

- **Accuracy** — every datum carries a source receipt; the engine refuses to emit unsourced numbers;
  a fact ledger backs every claim with a primary source and date.
- **Originality** — not a TVL chatbot. The distribution-reachability lens, a rigorous six-part
  Distribution Score engine, and *absences treated as findings* are the moat. We surface results other
  RWA tools structurally can't: no-secondary-market, allowlist-vs-blocklist gating, OFT-only bridging,
  an RWA that *left* Mantle.
- **Depth of research** — six independent on-chain/first-party signals per asset, the proxy/exact
  distinction made explicit, two independent cross-chain sources, real compliance bytecode inspection,
  and a discovered protocol invariant (self-feedback forbidden) turned into a design decision.
- **Quality** — all four Mantle agent primitives live and reading real data; tests green; deployed and
  publicly auditable; reproducible build documented here and in the decision log.

---

## Appendix — key addresses & transactions (all in `docs/VERIFIED.md`)

| Item | Value |
|------|-------|
| Live tool | https://mantleflow.vercel.app |
| AgentCard | https://mantleflow.vercel.app/.well-known/agent-card.json |
| Agent identity (ERC-8004) | agentId **309**, wallet `0x8974881E39a5eF62214929B6CaA6EC0C6e7D47c7` |
| Register tx | `0x107ba4b249c7ec9794f4418c0032b4909d3edad59a0b275e06c9a31d319d5b88` |
| Provenance (setMetadata) tx | `0x021ce501da2e2e35391fc83e99ae5f03b08e352ad5c6c09fece7294dc20ee2a4` |
| Third-party reputation tx | `0x40ec59da35e7b01f774fd1828b899c3d7a7250fc9e903cd726567003358a6dc3` |
| x402 token (tmUSD, Sepolia) | `0x246e485a5966b19871f3e9297182f8cb49fd8242` |
| tmUSD deploy tx | `0x486276b9fdc2661fe5c8d7e4313f3a92d78a1fc5afa8e1602c500b6171a86c60` |
| x402 self-settle tx | `0xc01c89ddf1ebc10fa246e68bba442863455c8e18c6c6257088e1bb14f9e6910a` |
| MI4 (gated, no secondary) | `0x671642ac281c760e34251d51bc9eef27026f3b7a` (mainnet) |
| LayerZero V2 endpoint | `0x1a44076050125825900e736c501f859c50fE728c` |
| Identity registry (Sepolia) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation registry (Sepolia) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
</content>
</invoke>
