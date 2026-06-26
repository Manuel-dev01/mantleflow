/**
 * Constant-product (Uniswap-v2-style) price-impact maths.
 *
 * For a balanced x*y=k pool, selling a notional of USD `tradeUsd` of the asset into the pool moves
 * the price by a fraction `tradeUsd / (sideReserveUsd + tradeUsd)` — the classic CPMM slippage curve
 * (derived from `Δprice/price = Δx/(x+Δx)`). We express the relevant pool side in USD so the figure
 * is a real, explainable number rather than a model guess: the only inputs are the on-chain reserve
 * (a fact) and the trade size.
 *
 * Only valid for true constant-product pairs (`method: "cpmm-exact"`). For v3 / Liquidity-Book venues
 * we only have TVL and must not claim a slippage — callers pass `null` there.
 */

/** Standard order size we quote clearing slippage for, in USD. */
export const STANDARD_CLEAR_SIZE_USD = 250_000;

/**
 * Price impact (%) to clear `tradeUsd` against a constant-product pool side holding `sideReserveUsd`.
 * Returns 100 for an empty/zero reserve (a trade of any size fully drains it).
 */
export function cpmmSlippagePct(sideReserveUsd: number, tradeUsd: number): number {
  if (sideReserveUsd <= 0) return 100;
  if (tradeUsd <= 0) return 0;
  return (tradeUsd / (sideReserveUsd + tradeUsd)) * 100;
}
