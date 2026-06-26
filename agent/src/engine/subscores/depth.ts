import type { Sourced } from "../../types/source-receipt.js";
import type { LiquidityResult } from "../../dex/depth.js";
import type { SubScore } from "../types.js";
import { fmtUsd, liquidityBand } from "./util.js";

/** Liquidity-depth sub-score from per-venue liquidity (USD at ±2% of mid where exact). */
export function depthSubScore(liq: LiquidityResult): SubScore {
  const inputs: Sourced<unknown>[] = liq.venues.map((v) => ({ value: v, receipt: v.receipt }));
  if (liq.venues.length === 0) {
    return {
      id: "liquidity-depth",
      label: "Liquidity depth (±2% of mid)",
      status: "not-applicable",
      value: null,
      explanation: "No venue with measurable liquidity — depth is undefined where no market exists.",
      inputs,
    };
  }
  const depthNote =
    liq.totalDepthUsdAt2pct > 0
      ? ` ~${fmtUsd(liq.totalDepthUsdAt2pct)} tradeable within ±2% of mid (constant-product venues).`
      : " ±2% depth not precisely computable (venues are TVL-proxy only).";
  return {
    id: "liquidity-depth",
    label: "Liquidity depth (±2% of mid)",
    status: "computed",
    value: liquidityBand(liq.totalLiquidityUsd),
    explanation: `Aggregate venue liquidity ≈ ${fmtUsd(liq.totalLiquidityUsd)} across ${liq.venues.length} venue(s).${depthNote}`,
    inputs,
  };
}
