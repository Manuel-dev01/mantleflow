# Distribution Score - methodology & provenance

The composite is a **weighted partial mean** over the *computed* sub-scores - any the engine cannot
source are excluded and the composite is labelled partial. The engine refuses to emit a composite
without its sub-scores, and refuses to invent a sub-score it cannot source.

The engine is address-driven and runs on ANY Mantle ERC-20 (a curated featured asset or an arbitrary
contract address, mainnet or Sepolia). Non-curated tokens are labelled *uncurated* and given a heuristic
RWA classification (rwa / capital-market / uncertain / not-rwa) - a labelled estimate, never a fact.

## Sub-score derivations

- **Reachability** `0 | 25 + 25·venues` - GeckoTerminal indexes every Mantle DEX (Agni, Merchant Moe
  classic + Liquidity Book, FusionX, and others), corroborated by an on-chain `getPair` probe; DefiLlama
  single-asset positions are surfaced as yield, not counted. `noSecondaryMarket` ⇒ 0 and a headline
  ("No on-chain secondary venue found"). If the DEX index can't be reached: *insufficient-data*, never a false 0.
- **Liquidity depth** - on-chain `getReserves` on constant-product pairs gives exact reserves; GeckoTerminal
  pools give `reserve_in_usd`, from which the ±2% depth and **$250k clearing slippage** (`slipPctAt250k`)
  are a CPMM **estimate** (labelled `kind: estimate`, never presented as exact). 24h volume shown per venue.
- **Fragmentation** - HHI = Σ(shareᵢ²)·10000 across venue USD liquidity; value = `100 − HHI/100`.
- **Borrowability** - Lendle `ProtocolDataProvider`: LTV, liquidation threshold, supply/borrow APR,
  utilization. Not-listed is a finding (scored 0), not an omission.
- **Compliance gating** - proxy-resolved ABI inspected for transfer hooks, resolved into three tiers:
  **permissioned** (Securitize DS-Token `preTransferCheck`/`registryService`, ERC-1404, allowlist - must be
  approved to hold → GATED), **restrictable** (blocklist / sanctions / account-freeze → BLOCKABLE), or
  **open** (no hooks). A global `pause` is not holder gating. Reports the **mechanism**; if it can't
  source-verify, it returns *insufficient-data* - never a false "freely transferable".

## Source receipts

Every input is `{ value, receipt: { sourceName, url, observedAt, kind } }`. `kind` ∈ {fact, estimate,
assumption}. No number ships without one - accuracy is a judged axis.

## On-chain provenance (ERC-8004)

MantleFlow registers an **ERC-8004 identity** (ERC-721; registered on Mantle mainnet as agentId **#141**,
with a prior Sepolia identity **#309**, dual-network - the live site reads whichever it is configured for) and can
write a **provenance receipt** for any result by stamping it into its OWN identity metadata:
`Identity.setMetadata(agentId, key = keccak256(canonicalJSON(map)), value = {symbol, uri, at})`.
Content-addressed, owner-authorized, tamper-evident - **not** a self-score. (The Reputation registry
deliberately forbids self-feedback, so reputation is reserved for genuine third parties.) Anyone can
recompute the map, hash it, and find the matching `MetadataSet` event on-chain.
