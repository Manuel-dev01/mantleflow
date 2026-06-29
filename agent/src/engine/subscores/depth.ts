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
    // Only a confirmed absence if the comprehensive DEX index actually responded. If GeckoTerminal
    // was unreachable we cannot claim "no market" — report insufficient-data (mirrors reachability).
    if (!liq.gtSourced) {
      return {
        id: "liquidity-depth",
        label: "Liquidity depth (±2% of mid)",
        status: "insufficient-data",
        value: null,
        explanation:
          "The comprehensive DEX index (GeckoTerminal) was unreachable, so depth could not be measured — not a confirmed absence.",
        inputs,
      };
    }
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
  // If the full index was unreachable but on-chain probing found venue(s), the number is a partial
  // lower bound, not the whole market — say so rather than present it as authoritative.
  const partialNote = liq.gtSourced
    ? ""
    : " (partial — the full DEX index was unreachable; based only on the on-chain venues found.)";
  const depthNote =
    liq.totalDepthUsdAt2pct > 0
      ? ` ~${fmtUsd(liq.totalDepthUsdAt2pct)} tradeable within ±2% of mid (${hasExact ? "exact on-chain reserves + " : ""}CPMM estimate from pool reserves).`
      : " ±2% depth not computable for these venues.";
  return {
    id: "liquidity-depth",
    label: "Liquidity depth (±2% of mid)",
    status: "computed",
    value: liquidityBand(liq.totalLiquidityUsd),
    explanation: `Aggregate trading-venue liquidity ≈ ${fmtUsd(liq.totalLiquidityUsd)} across ${liq.swapVenues.length} venue(s).${partialNote}${depthNote}`,
    inputs,
  };
}
