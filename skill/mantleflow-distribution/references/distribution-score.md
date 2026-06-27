# Distribution Score — methodology & provenance

The composite is a **weighted partial mean** over the *computed* sub-scores (cross-chain excluded
until Phase 4), always labelled as partial. The engine refuses to emit a composite without its
sub-scores, and refuses to invent a sub-score it cannot source.

## Sub-score derivations

- **Reachability** `0 | 25 + 25·venues` — Merchant Moe factories + DefiLlama pools. `noSecondaryMarket`
  ⇒ 0 and a headline ("No on-chain secondary venue found").
- **Liquidity depth** — for constant-product pairs, on-chain `getReserves` → USD within ±2% of mid,
  exact; plus the real **$250k clearing slippage** (`slipPctAt250k`). v3 / Liquidity-Book venues are
  TVL-proxy (labelled; no false precision).
- **Fragmentation** — HHI = Σ(shareᵢ²)·10000 across venue USD liquidity; value = `100 − HHI/100`.
- **Borrowability** — Lendle `ProtocolDataProvider`: LTV, liquidation threshold, supply/borrow APR,
  utilization. Not-listed is a finding (scored 0), not an omission.
- **Compliance gating** — proxy-resolved ABI inspected for Securitize DS-Token (`preTransferCheck`,
  `registryService`), ERC-1404, allowlist/blocklist, pause hooks. Reports the **mechanism**; if it
  can't source-verify, it returns *insufficient-data* — never a false "freely transferable".

## Source receipts

Every input is `{ value, receipt: { sourceName, url, observedAt, kind } }`. `kind` ∈ {fact, estimate,
assumption}. No number ships without one — accuracy is a judged axis.

## On-chain provenance (ERC-8004)

MantleFlow registers an **ERC-8004 identity** (ERC-721 agentId) on Mantle Sepolia and can write a
**provenance receipt** to the Reputation registry for any result: `giveFeedback(...)` with
`feedbackHash = keccak256(canonicalJSON(map))`, neutral `value` (0 — this is provenance, **not** a
self-score), `tag1 = "distribution-analysis"`, `tag2 = symbol`, `feedbackURI` → the re-derivable
result. Anyone can recompute the map, hash it, and check it matches the on-chain commitment.
