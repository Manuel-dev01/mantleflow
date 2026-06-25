# CLAUDE.md — MantleFlow Operating Manual

> This file governs **every** Claude Code session in this repo. Read it fully at the
> start of each session before doing anything else. It is the source of truth for
> standards, verified facts, and guardrails. `PROJECT_BRIEF.md` defines *what* we're
> building and the staged plan; this file defines *how* we work and what is *true*.
> When the two conflict, raise it — do not silently pick one.

---

## 0. WHAT THIS PROJECT IS (one paragraph, never forget)

MantleFlow is an AI **research agent that maps the *distribution* of tokenized / real-world
assets on Mantle** — not their issuance. For any Mantle-native RWA or capital-market asset,
it answers in natural language: *where can this asset actually be bought, sold, borrowed
against, and bridged, and who is gated from holding it?* It is being built to **win the #1
spot in the Mantle Research Challenge, Track 2 (The Research Agent)**, deadline **July 3,
2026**. Judging axes are **quality, accuracy, originality, depth of research**, with explicit
**bonus points for using Mantle's AI Agent Skills**. Distribution-not-issuance is the
challenge's thesis and Mantle's own self-positioning ("the distribution layer for RWAs"). Every
decision should ladder up to winning on those axes.

---

## 1. PRIME DIRECTIVES (in priority order)

1. **Accuracy is a judging axis, so it is a code rule.** Never display, log, or write into the
   research output a number, rate, address, or claim without a **traceable source and a
   timestamp**. If you cannot source it, label it an estimate or omit it. Fabricated or
   stale on-chain data is a losing-grade defect.
2. **Verify before you build on a moving primitive.** The three things most likely to be wrong
   from memory are: the **AI Agent Skills** registration format, the **ERC-8004** registry
   addresses/ABIs on Mantle, and the **x402-via-QuestFlow** facilitator flow. Never scaffold
   architecture-dependent code on these until confirmed from a **primary source** and recorded
   in `docs/VERIFIED.md`. (See §4.)
3. **Real on-chain reads only.** The competition is won by a live example that genuinely reads
   Mantle state. Never hardcode, mock-in-disguise, or fake a result in anything a judge will
   see. Mocks are allowed only in tests, clearly named as such.
4. **The Distribution Score engine is the moat — keep it rigorous.** It is the original IP. No
   hand-waving: every sub-score is computed from sourced data and is explainable down to the
   underlying numbers. (See §6.)
5. **Ship vertical slices, not horizontal layers.** One asset working end-to-end beats six
   assets half-wired. Always keep `main` deployable and the live URL working.
6. **Earn the bonus.** The AI Agent Skills registration is free points most entrants will skip.
   Treat it as mandatory scope, not a nice-to-have.

---

## 2. VERIFIED GROUND TRUTH (trust these — confirmed from primary/secondary sources)

These are confirmed and may be used without re-verifying. If you find a primary source that
**contradicts** any of these, stop and flag it; do not silently overwrite.

### Mantle agent stack (shipped Q1 2026, live)
- Four primitives: **(a) ERC-8004 agent identity, (b) AI Agent Skills, (c) Agent Scaffold,
  (d) x402 payments via QuestFlow.**
- **ERC-8004** is backwards-compatible and interoperates with **MCP**, **A2A** (agent-to-agent),
  and **x402**. It provides **identity + reputation + validation** registries.

### Networks
- **Mantle Sepolia (testnet):** chain ID **5003**; RPC `https://rpc.sepolia.mantle.xyz`;
  faucet `https://faucet.sepolia.mantle.xyz`; explorer `explorer.sepolia.mantle.xyz` /
  mantlescan family; WebSocket `wss://ws.sepolia.mantle.xyz` (verify before relying on WS).
  Gas token **MNT**.
- **Mantle mainnet:** chain ID **5000**; RPC `https://rpc.mantle.xyz`; explorer
  `explorer.mantle.xyz`. Gas token **MNT**.
- (Note: the old `5001` "BIT" testnet is **deprecated** — ignore any docs referencing chain
  5001 / BIT / Goerli.)

### Real Mantle RWA / capital-market assets to support
- **MI4** (Mantle Index Four) — tokenized index; **Securitize** is transfer agent. Centerpiece.
- **mETH / cmETH** — liquid-staked / restaked ETH.
- **fBTC** (Function BTC) — omnichain wrapped BTC.
- **Ethena USDe** and **Ondo USDY** — yield-bearing stablecoin / tokenized treasury.
- **Maple Finance syrupUSDT** — deployed via **Aave** on Mantle (~$90.1M TVL, Q1 2026).
- **xStocks** — tokenized equities.
- Context figures (cite with date when used): Mantle **RWA TVL $247.5M, +27.4% QoQ in Q1 2026**
  (Messari, reported June 9 2026); Mantle treasury **$4B+**.

### DeFi venues on Mantle (for distribution mapping)
- DEXs: **Merchant Moe** (Liquidity Book), **Agni**, **FusionX**, **Butter** (aggregator).
- Lending: **Lendle**, **INIT Capital**, **Aave on Mantle**.
- Oracles: **Pyth**, **API3**, **Redstone**, **Chainlink** + **CCIP** (cross-chain routes).

### Data sources (free/cheap, wireable in the timeline)
- **DefiLlama** — TVL / pools / yields / stablecoins; also a public **MCP server**.
- **Mantlescan API** — Etherscan-family REST (ABIs, balances, txs, token transfers/holders).
- **The Graph / Goldsky** subgraphs on Mantle — DEX/lending structured data.

> Everything NOT in this section that touches a contract address, an API schema, or a spec
> detail is **unverified** until you confirm it and add it here.

---

## 3. UNVERIFIED / HIGH-RISK (do not assume — confirm from primary source first)

Resolve these in **Phase 0** and record answers in `docs/VERIFIED.md` with URL + date:
1. **AI Agent Skills** — exact format and registration. Is a "Mantle AI Agent Skill" the open
   Anthropic `SKILL.md` folder format, an MCP server, or a Mantle-registry submission? What
   exactly must be produced/registered to earn the bonus? (Check the official challenge page,
   `docs.mantle.xyz` / Mantle Cookbook, `github.com/mantlenetworkio`, the Agent Scaffold repo.)
2. **ERC-8004 registry addresses + ABIs on Mantle** (mainnet + Sepolia): Identity, Reputation,
   Validation registries — addresses and the exact signatures for register / set AgentCard URI /
   write feedback / write validation.
3. **x402 via QuestFlow** — facilitator endpoint, the 402 challenge JSON schema, the settlement
   stablecoin on Mantle (USDC vs USDe vs mUSD), and the client payment-payload flow (expect
   EIP-3009 `transferWithAuthorization`).
4. **Submission mechanics / any judge rubric** — re-read the official brief + Typeform for
   format requirements; build to spec.

If a primary source is unreachable, **say so explicitly** and use the documented fallback in
`PROJECT_BRIEF.md` §3 rather than guessing.

---

## 4. THE VERIFICATION DISCIPLINE (how we treat facts)

- **`docs/VERIFIED.md` is the fact ledger.** Every confirmed primitive detail, address, schema,
  or figure goes here as: `claim — value — primary source URL — date confirmed`.
- A fact is **"verified"** only if it came from a primary source (Mantle docs/GitHub/official
  announcement, the ERC-8004 / x402 spec, the asset issuer). Secondary/news sources are
  acceptable for *context figures* but must be dated and labeled.
- When you state a fact in code comments, the UI, or the writeup, it must be traceable to
  `docs/VERIFIED.md` or carry its own inline source.
- **Never silently update a verified fact.** If new evidence contradicts the ledger, surface the
  conflict to me with both sources before changing anything.
- Distinguish **fact vs estimate vs assumption** everywhere. The writeup and UI must make the
  distinction visible to a judge.

---

## 5. ENGINEERING STANDARDS

### Repo shape (monorepo)
```
/contracts   Foundry, Solidity — ERC-8004 identity/reputation writes, any x402 helper
/agent       Go — orchestration, data adapters, MCP/Skill server, x402 middleware, scoring
/web         Next.js (App Router) + TS + Tailwind + shadcn/ui — Vercel deploy
/skill       the Mantle AI Agent Skill package
/docs        VERIFIED.md, DECISIONS.md, RESEARCH.md (the writeup), architecture notes
```

### Go (agent backend — primary language)
- Idiomatic, context-aware (`context.Context` threaded through). Structured logging.
- `chi` for HTTP; `pgx/v5` + `sqlc` if persistence is needed; otherwise in-memory + cache.
- Data adapters behind interfaces so sources are swappable and individually testable.
- **Table-driven tests.** Network calls mocked in tests; never mocked in production paths.
- Rate-limit-aware and cache-aggressive on every external API (DefiLlama, Mantlescan, subgraphs).

### Solidity (Foundry)
- Comprehensive tests for anything we author; aim for full coverage on critical paths.
- No unaudited external calls in critical paths. Sepolia first, mainnet only when stable.
- Keep deploy scripts reproducible and addresses recorded in `docs/VERIFIED.md`.

### Next.js (frontend)
- App Router, TypeScript, Tailwind, shadcn/ui. Mobile-responsive. Deploy to **Vercel**.
- **Source receipts in the UI:** every displayed data point carries its source + timestamp
  (a tooltip/expandable is fine). This is a feature, not decoration — accuracy is judged.
- No browser `localStorage`/`sessionStorage` in any artifact-style component; keep state in React.

### Git / process
- Small atomic commits; conventional messages. Keep `main` deployable at all times.
- Keep `docs/VERIFIED.md` and `docs/DECISIONS.md` current **as you go**, not retroactively.
- At each phase boundary (see PROJECT_BRIEF §6), **stop and present a checkpoint** for approval.

---

## 6. THE DISTRIBUTION SCORE ENGINE (our original IP — spec)

For each asset, compute and **explain** these sub-scores. Each must be derived from sourced data
and be drillable to the underlying numbers in the UI:

1. **Secondary-market reachability** — does a live secondary venue exist at all? (binary +
   venue list)
2. **Liquidity depth** — USD depth available at ±2% from mid, aggregated across venues.
3. **Fragmentation index** — Herfindahl–Hirschman Index (HHI) of liquidity across
   venues/chains. Higher = more concentrated; lower = more fragmented. Show the components.
4. **Borrowability** — lending markets accepting it as collateral: collateral factor,
   supply/borrow rates, utilization.
5. **Cross-chain reach** — which CCIP/bridge routes exist; estimated cost + slippage to exit
   $X to chain Y.
6. **Compliance gating** — does the token contract carry transfer restrictions / allowlists /
   transfer-agent hooks? Detect via ABI/bytecode inspection + known issuer patterns (e.g.
   Securitize-style permissioning on MI4). Report the gate, don't just score it.

Rules: never emit a composite score without the sub-scores and their sourced inputs. A finding
of *"no secondary market"* or *"holder is gated"* is a **headline research result**, not a gap —
it proves the distribution thesis. Treat absences as signal.

---

## 7. ORIGINALITY GUARDRAILS (what makes us LOSE)

- ❌ A generic "chat with Mantle TVL," or a thin DefiLlama/Dune wrapper, or a price dashboard.
- ❌ Faking or hardcoding the live example.
- ❌ Skipping the AI Agent Skills registration (free bonus points).
- ❌ Numbers without sources; estimates dressed as facts.
- ✅ The moat = the distribution-reachability lens + a rigorous Distribution Score engine + the
  full agent-native stack (Mantle AI Agent Skill + ERC-8004 identity/reputation + x402/QuestFlow
  monetization), all reading real Mantle data, all framed by the distribution thesis.

---

## 8. THE ONE LIVE EXAMPLE (must work end-to-end, build it first)

> *"I hold $1M of MI4 — where can I exit it, how deep is secondary liquidity, what can I borrow
> against it, and what's the cheapest route to move it to another chain?"*

The agent charges via x402, reads live Mantle data, returns a distribution map with real
depth / fragmentation / borrowability / route / compliance numbers, and writes an ERC-8004
reputation attestation on completion. This exact path is the Phase 1 vertical slice (MI4 only),
then everything else broadens around it.

---

## 9. SESSION RITUAL (do this every session)

1. Read this file and `PROJECT_BRIEF.md`. Skim `docs/VERIFIED.md` and `docs/DECISIONS.md`.
2. State which **phase** we're in and the single next deliverable.
3. If the work touches a §3 high-risk primitive and it isn't yet in `docs/VERIFIED.md`, **do
   Phase 0 verification for it first.**
4. Work in a vertical slice; keep `main` deployable; update the docs ledgers as you go.
5. At a phase boundary or a consequential architectural fork, **stop and present a checkpoint**
   — don't push ahead unilaterally.

## 10. COMMUNICATION STYLE WITH ME

- Direct and decisive. Give me a concrete recommendation with the trade-off, not a menu.
- Show receipts: when you assert a fact, cite where it came from.
- Flag capability boundaries honestly — accurate representation over overselling. If something
  can't be verified or built in time, say so early and propose the fallback.
- Push back explicitly if something I've asked for would hurt the win condition.
- No filler, no generic AI hedging. Tight prose.