import type { Sourced } from "../../types/source-receipt.js";
import type { LiquidityResult } from "../../dex/depth.js";
import type { SubScore } from "../types.js";

/**
 * Fragmentation = Herfindahl–Hirschman Index over per-venue USD liquidity shares.
 * HHI ∈ [0, 10000]; 10000 = a single venue (fully concentrated). The sub-score VALUE inverts it so
 * higher = better distribution (more, more-even venues): value = 100 − HHI/100.
 */
export function fragmentationSubScore(liq: LiquidityResult): SubScore {
  const v = liq.venues.filter((x) => x.liquidityUsd > 0);
  const inputs: Sourced<unknown>[] = v.map((x) => ({ value: x, receipt: x.receipt }));
  if (v.length === 0) {
    return {
      id: "fragmentation",
      label: "Fragmentation (HHI)",
      status: "not-applicable",
      value: null,
      explanation: "No liquidity to distribute — fragmentation is undefined.",
      inputs,
    };
  }
  const total = v.reduce((s, x) => s + x.liquidityUsd, 0);
  const hhi = v.reduce((s, x) => {
    const share = x.liquidityUsd / total;
    return s + share * share;
  }, 0) * 10000;
  const value = Math.max(0, Math.round(100 - hhi / 100));
  const concentration =
    v.length === 1
      ? "Liquidity is fully concentrated in one venue."
      : `Liquidity spread across ${v.length} venues.`;
  return {
    id: "fragmentation",
    label: "Fragmentation (HHI)",
    status: "computed",
    value,
    explanation: `HHI = ${Math.round(hhi)} (10000 = single venue). ${concentration}`,
    inputs,
  };
}
