# Distribution Findings

**What MantleFlow found when it mapped the distribution of six tokenized assets on Mantle.**

These are real results from live on-chain reads, not illustrations. Each is reproducible: open the
asset in the [live tool](https://mantleflow.vercel.app) and drill into the source receipt behind any
number. Dates below are the observation timestamps; the live app shows the full source/timestamp on
every datum.

> The headline isn't "nothing trades on Mantle." It's that **six assets all called "tokenized" span
> from a permissioned token with no secondary market at all (MI4) to a stablecoin with ~$17.5M of DEX
> liquidity (USDe)** — issuance is uniform, distribution is wildly uneven. That spread *is* the result.

---

## The spectrum at a glance

| Asset | What it is | DEX venues | DEX liquidity | Composite | Compliance |
|-------|------------|:----------:|--------------:|:---------:|------------|
| **MI4** | Tokenized index (Securitize) | **0** | $0 | 5 | **GATED** — transfer-agent allowlist |
| **USDY** | Tokenized treasury (Ondo) | 20 | **~$5k** (dust) | 52 | BLOCKABLE — blocklist |
| **fBTC** | Omnichain wrapped BTC | 16 | ~$1.4M | 57 | BLOCKABLE — account blocklist |
| **cmETH** | Restaked ETH | 20 | ~$1.9M | 66 | BLOCKABLE — sanctions screening |
| **mETH** | Liquid-staked ETH | 20 | ~$4.3M | 69 | BLOCKABLE — blocklist; Lendle reserve **frozen** |
| **USDe** | Yield-bearing stablecoin | 20 | **~$17.5M** | 77 | **OPEN** |

*Venues and liquidity via GeckoTerminal across all Mantle DEXs (Agni, Merchant Moe classic + Liquidity
Book, FusionX, …), observed 2026-06-27. Composite = the Distribution Score; see
[`METHODOLOGY.md`](METHODOLOGY.md).*

Context (secondary, dated): Mantle RWA TVL was **$247.5M, +27.4% QoQ in Q1 2026** (Messari, reported
2026-06-09). The capital is arriving — these are the rails it lands on.

---

## MI4 — issued, but barely *distributed*

`0x671642ac281c760e34251d51bc9eef27026f3b7a` (Mantle mainnet) · "Mantle Index Four", 6 decimals,
total supply ~1.35M (on-chain, 2026-06-25). Issuer / transfer agent: **Securitize**.

- **Compliance: GATED.** The contract is a proxy following the Securitize **DS-Token** pattern. The
  compliance detector flagged a **transfer-agent allowlist** — gating functions present on the
  proxy-resolved implementation ABI (Etherscan V2, 2026-06-25). Transfers are restricted to
  permissioned wallets.
- **Reachability: none.** No on-chain secondary venue exists — checked comprehensively across all
  Mantle DEXs (GeckoTerminal) plus an on-chain Merchant Moe `getPair` probe: **0 pools** (2026-06-27).
  No market price exists for MI4 anywhere.

**The finding:** MI4 is a fully-issued, $1M-scale tokenized index whose *only* exit is issuer
redemption, and whose holders are an allowlist. The flagship question — *"I hold $1M of MI4, where can
I exit it?"* — has a concrete, source-backed answer: **you can't sell it on the open market, and you
couldn't have bought it without being allowlisted.** Composite **5/100**. The distribution thesis,
proven on a single asset.

---

## Compliance resolves into three tiers — not one "compliant" bit

Read from each token contract's ABI, the engine separates *who can hold an asset* into three distinct
mechanisms — a real distribution distinction that a single compliant/non-compliant flag would erase:

- **GATED (permissioned-in)** — you must be approved to hold. **MI4** only (Securitize allowlist).
- **BLOCKABLE (permissioned-out)** — freely held unless an account is blocked or sanctioned:
  - **mETH** and **fBTC** — account blocklist (`isBlocked` / `lockUser`).
  - **USDY** — Ondo blocklist transfer hook (`0x5bE26527e817998A7206475496fDE1E68957c5A6`, on-chain
    2026-06-26).
  - **cmETH** — **sanctions screening** (`isSanctioned` / `sanctionsList`).
- **OPEN** — no holder-gating hooks. **USDe** only.

Distinguishing an *allowlist* (permissioned-in) from a *blocklist* (permissioned-out) is the difference
between "you may not be allowed to buy this" and "you may be frozen out after you hold it." A global
`pause` is not treated as holder gating — the engine reports the mechanism, not a verdict.

---

## Liquidity: same label, wildly different reality

- **USDe** is the most liquid tracked asset — ~$17.5M across 20 pools.
- **USDY** is the striking middle case — **listed on 20 pools yet only ~$5k of real depth.** Wide
  listing is not the same as deep liquidity; the tool surfaces the gap rather than the pool count.
- **mETH** has the deepest LST liquidity (~$4.3M); **cmETH** ~$1.9M; **fBTC** ~$1.4M.

Per-venue ±2% depth and $250k clearing slippage are **CPMM estimates** derived from pool reserves —
labelled as estimates throughout, never presented as exact. 24h volume is shown alongside liquidity.

---

## Cross-chain: RWAs travel by LayerZero or not at all — never CCIP

- **LayerZero V2 endpoint on Mantle** = `0x1a44076050125825900e736c501f859c50fE728c`, confirmed by an
  on-chain `endpoint()` read on **cmETH** (`0xE6829d9a…e8fA`) and **USDe** (`0x5d3a1Ff2…ef34`) — both
  are LayerZero OFTs. mETH / fBTC / MI4 / USDY do **not** expose this endpoint (2026-06-27).
- **Chainlink CCIP on Mantle** carries LINK / USDC / USDT / wstETH / W0G — **none of the tracked
  RWAs** (CCIP REST API, `chainId=5000`, 2026-06-27).

**The finding:** the cross-chain path for Mantle RWAs is LayerZero-OFT-specific, asset by asset — there
is no neutral, CCIP-style RWA bridge. An asset not deployed as an OFT has *no verified canonical bridge
channel at all.* A structural distribution gap, surfaced from two independent sources. Per-transaction
bridge fees are dynamic, so cost is reported "not quoted" — never fabricated.

---

## Borrowability: a frozen market is not a borrowable one

**mETH** is listed on Lendle with an 82.5% LTV — but its reserve is **frozen** (supply/borrow halted),
read live from `getReserveConfigurationData` / `getReserveData`. So its borrowability scores **20**, not
the ~91 the raw LTV would imply: practical borrowability is near zero, and the score must not contradict
the on-chain frozen flag. The other tracked assets are not listed on Lendle and score 0 on this axis.
Both states are reported as findings.

---

## syrupUSDT — distribution can *regress*

Maple Finance's syrupUSDT, a Mantle asset earlier in Q1 2026 (~$90.1M TVL), is **no longer on Mantle**:
Maple withdrew USDT from Aave-on-Mantle around 2026-04-20 (rsETH-exploit caution). MantleFlow records
this as a first-class distribution finding — *an RWA that left Mantle* — rather than silently dropping
it. Distribution is not monotonic.

---

## Scope of these findings

Honesty about boundaries is part of the result:

- **Reachability counts on-chain DEX venues** indexed by GeckoTerminal plus an on-chain `getPair`
  corroboration. Yield/vault positions are surfaced separately, not counted as trading venues.
- **±2% depth and slippage are CPMM estimates** from pool reserves where tick-level data isn't
  available; on-chain reserves are exact. Both are labelled.
- **Compliance is detected from the contract**, not from a legal opinion — the on-chain mechanism and
  its evidence, with no per-jurisdiction breakdown (that can't be verified from bytecode).
- **Cross-chain cost is not quoted** — channel existence is verified; per-tx fees are dynamic.

Every figure here is reproducible against live Mantle state through the tool, and every number it
displays carries its own source and timestamp.
