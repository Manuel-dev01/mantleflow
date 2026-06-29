# Distribution Score — methodology & provenance

The composite is a **weighted partial mean** over the *computed* sub-scores — any the engine cannot
source are excluded and the composite is labelled partial. The engine refuses to emit a composite
without its sub-scores, and refuses to invent a sub-score it cannot source.

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

MantleFlow registers an **ERC-8004 identity** (ERC-721 agentId **#309** on Mantle Sepolia) and can
write a **provenance receipt** for any result by stamping it into its OWN identity metadata:
`Identity.setMetadata(agentId, key = keccak256(canonicalJSON(map)), value = {symbol, uri, at})`.
Content-addressed, owner-authorized, tamper-evident — **not** a self-score. (The Reputation registry
deliberately forbids self-feedback, so reputation is reserved for genuine third parties.) Anyone can
recompute the map, hash it, and find the matching `MetadataSet` event on Sepolia.
