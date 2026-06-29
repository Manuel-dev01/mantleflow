# Methodology - The Distribution Score

**How MantleFlow turns live Mantle state into a six-axis measure of how *distributed* an asset is.**

The Distribution Score is the heart of the product. For each asset it computes six independent
sub-scores, each derived from sourced on-chain or first-party API data, each drillable in the UI down
to the underlying numbers. The engine never emits a sub-score it cannot source, and never emits a
composite without showing its parts.

---

## The six sub-scores

| # | Sub-score | What it measures | Primary source |
|---|-----------|------------------|----------------|
| 1 | **Secondary-market reachability** | Does a live on-chain trading venue exist at all, and where? | GeckoTerminal (all Mantle DEXs) + on-chain Merchant Moe `getPair` |
| 2 | **Liquidity depth** | USD depth available within ±2% of mid, aggregated across venues | On-chain `getReserves` (exact) + GeckoTerminal `reserve_in_usd` (estimate) |
| 3 | **Fragmentation (HHI)** | How concentrated or split liquidity is across venues | Herfindahl–Hirschman index over per-venue USD liquidity |
| 4 | **Borrowability** | Is it accepted as collateral? LTV, rates, frozen state | Lendle `ProtocolDataProvider` (on-chain) |
| 5 | **Cross-chain reach** | Which verified bridge channels exist | LayerZero OFT `endpoint()` probe + Chainlink CCIP token registry |
| 6 | **Compliance gating** | Transfer restrictions / allowlists / blocklists / transfer-agent hooks | Contract ABI inspection (Etherscan V2) + issuer-pattern match |

### How each one is computed

- **Reachability** - `0` if no genuine trading venue is found; otherwise `min(100, 25 + 25·venues)`.
  Venues come from GeckoTerminal, which indexes every Mantle DEX (Agni, Merchant Moe classic + Liquidity
  Book, FusionX, …), corroborated by an on-chain `getPair` probe. DefiLlama single-asset positions are
  surfaced as **yield**, not counted as trading venues. A zero is a *finding*, not a gap - because the
  check is comprehensive. If the DEX index can't be reached, reachability is **insufficient-data**,
  never a false zero.

- **Liquidity depth** - on-chain constant-product pairs give **exact** reserves; GeckoTerminal pools
  give `reserve_in_usd`, from which ±2% depth and $250k clearing slippage are a **CPMM estimate** (one
  side ≈ reserve/2), clearly labelled as an estimate and never presented as exact. 24h volume is shown
  alongside liquidity. Venues without reserve data report "-" rather than an unsourced number.

- **Fragmentation (HHI)** - the Herfindahl–Hirschman index over per-venue USD liquidity shares. High =
  concentrated in one venue; low = fragmented (capital split, harder to exit size). The components are
  shown.

- **Borrowability** - Lendle (an Aave-v2 fork) is read on-chain for LTV, liquidation threshold, supply
  and borrow rates, and utilization. Not listed = `0`. A **frozen** reserve (supply/borrow halted)
  scores `20` regardless of LTV - practical borrowability is near zero, and the score must not
  contradict the on-chain frozen flag.

- **Cross-chain reach** - scored only from verified channels: a LayerZero OFT (on-chain `endpoint()`
  equals the LayerZero V2 endpoint) and Chainlink CCIP membership. With no verified channel the
  sub-score is **insufficient-data** and is *excluded from the composite* - never a false zero.
  Per-transaction bridge fees are dynamic, so cost is reported "not quoted."

- **Compliance gating** - three tiers read from the contract ABI: **permissioned** (allowlist /
  transfer-agent / ERC-1404 - must be approved to hold → `15`, "GATED"); **restrictable** (blocklist /
  sanctions / account-freeze - freely held unless an account is blocked → `60`, "BLOCKABLE"); or
  **open** (no hooks → `90`). A global `pause` is not treated as holder gating. The mechanism is named.
  If the ABI can't be read the sub-score is **insufficient-data** - neither gated nor ungated.

---

## The composite is honest by construction

The composite is a **weighted mean over the sub-scores that could be computed**, renormalising the
weights among those present:

| Sub-score | Weight |
|-----------|:------:|
| Reachability | 0.25 |
| Liquidity depth | 0.20 |
| Borrowability | 0.20 |
| Compliance | 0.20 |
| Fragmentation | 0.15 |
| Cross-chain | 0.15 |

Two rules keep it from ever misleading:

1. **It is suppressed entirely when fewer than three of the six sub-scores compute** - an unread axis
   never produces a hard, misleading "0/100."
2. **Every map carries a self-describing note** listing exactly which sub-scores went into the composite
   and which were not scored - so any number can be read back to what went into it and what didn't.

---

## Source receipts - accuracy as a product feature

Every externally-sourced datum is wrapped in a **source receipt**:

```
SourceReceipt { sourceName, url, observedAt, kind }   where kind ∈ { fact, estimate, assumption }
```

The engine refuses to emit a composite without its sub-scores and their receipts. In the UI, every
displayed number carries a popover showing where it came from, when it was observed, and whether it is
a fact, an estimate, or an assumption. This is how a reader audits the tool - it is a feature, not
decoration.

The distinction is enforced, not cosmetic:

- **Facts** - direct on-chain reads (token decimals, reserves, reserve configuration, bridge endpoints)
  and first-party API values.
- **Estimates** - anything derived, such as ±2% depth and slippage computed from pool reserves under a
  CPMM assumption. Always labelled.
- **Assumptions** - clearly flagged where used; absences (no venue, no verified channel) are reported as
  findings, never silently filled.

A datum is treated as verified only when it comes from a primary source - Mantle docs/GitHub, an
official post, a protocol spec, an asset issuer, or a direct on-chain read. Secondary/news sources are
used only for context figures, and are dated and labelled as such.

---

## Data sources

| Source | Used for | Notes |
|--------|----------|-------|
| **GeckoTerminal** | DEX venues, liquidity, 24h volume across 10+ Mantle DEXs | Keyless; the primary venue/liquidity index |
| **On-chain reads (viem)** | Token facts, reserves, lending config, bridge endpoints, compliance hooks | Exact; the source of truth |
| **DefiLlama** | Yield/vault positions and TVL context | Yield surfaced separately from trading venues |
| **Etherscan V2** | Contract ABIs for compliance detection | Proxy-resolved to the implementation |
| **Chainlink CCIP registry** | Cross-chain channel membership | First-party REST, `chainId=5000` |

See [`FINDINGS.md`](FINDINGS.md) for the results this methodology produced, and [`USAGE.md`](USAGE.md)
for how to run it yourself.
