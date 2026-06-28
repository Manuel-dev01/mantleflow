import type { Sourced } from "../../types/source-receipt.js";
import type { LiquidityResult } from "../../dex/depth.js";
import type { SubScore } from "../types.js";
import { fmtUsd, liquidityBand } from "./util.js";

/** Liquidity-depth sub-score from per-venue liquidity (USD at ±2% of mid where exact). Computed over
 * genuine SWAP venues only — single-asset yield/vault positions are not tradeable secondary depth. */
export function depthSubScore(liq: LiquidityResult): SubScore {
  // Keep ALL venues in inputs (drillable), but score over swap venues only.
  const inputs: Sourced<unknown>[] = liq.venues.map((v) => ({ value: v, receipt: v.receipt }));
  if (liq.swapVenues.length === 0) {
    const yieldNote = liq.yieldVenues.length
      ? ` ${liq.yieldVenues.length} yield/vault position(s) exist but are not exit liquidity.`
      : "";
    return {
      id: "liquidity-depth",
      label: "Liquidity depth (±2% of mid)",
      status: "not-applicable",
      value: null,
      explanation: `No genuine trading venue — depth is undefined where no secondary market exists.${yieldNote}`,
      inputs,
    };
  }
  const hasExact = liq.swapVenues.some((v) => v.method === "cpmm-exact");
  const depthNote =
    liq.totalDepthUsdAt2pct > 0
      ? ` ~${fmtUsd(liq.totalDepthUsdAt2pct)} tradeable within ±2% of mid (${hasExact ? "exact on-chain reserves + " : ""}CPMM estimate from pool reserves).`
      : " ±2% depth not computable for these venues.";
  return {
    id: "liquidity-depth",
    label: "Liquidity depth (±2% of mid)",
    status: "computed",
    value: liquidityBand(liq.totalLiquidityUsd),
    explanation: `Aggregate trading-venue liquidity ≈ ${fmtUsd(liq.totalLiquidityUsd)} across ${liq.swapVenues.length} venue(s).${depthNote}`,
    inputs,
  };
}
