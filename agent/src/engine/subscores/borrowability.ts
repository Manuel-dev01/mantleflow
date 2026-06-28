import type { Sourced } from "../../types/source-receipt.js";
import type { LendleReserve } from "../../adapters/lendle.js";
import type { SubScore } from "../types.js";
import { clamp } from "./util.js";

/** Borrowability sub-score from a Lendle reserve read. Not-listed is a finding, scored 0. */
export function borrowabilitySubScore(reserve: Sourced<LendleReserve>): SubScore {
  const r = reserve.value;
  // Serializable summary (no BigInt) — the raw reserve's bigint fields must not reach JSON.
  const summary = {
    listed: r.listed,
    usageAsCollateralEnabled: r.usageAsCollateralEnabled,
    borrowingEnabled: r.borrowingEnabled,
    ltvPct: r.ltvPct,
    liquidationThresholdPct: r.liquidationThresholdPct,
    supplyAprPct: r.supplyAprPct,
    variableBorrowAprPct: r.variableBorrowAprPct,
    utilizationPct: r.utilizationPct,
    isFrozen: r.isFrozen,
  };
  const inputs: Sourced<unknown>[] = [{ value: summary, receipt: reserve.receipt }];

  if (!r.listed) {
    return {
      id: "borrowability",
      label: "Borrowability (Lendle)",
      status: "computed",
      value: 0,
      explanation:
        "Not listed on Lendle — cannot be supplied, borrowed, or used as collateral there. (Phase 2 reads Lendle only.)",
      inputs,
    };
  }

  // A FROZEN reserve cannot be supplied or borrowed against right now, even when it is configured as
  // collateral with a healthy LTV — so practical borrowability is near-zero regardless of the other
  // flags. We surface that as a low score (not the LTV-derived number) so the score never contradicts
  // the "reserve frozen" finding shown in the UI.
  if (r.isFrozen) {
    return {
      id: "borrowability",
      label: "Borrowability (Lendle)",
      status: "computed",
      value: 20,
      explanation: `Lendle reserve is FROZEN — supply/borrow against this asset is currently halted, so it cannot be borrowed against now (it is configured ${r.usageAsCollateralEnabled ? `as collateral, LTV ${r.ltvPct}%` : r.borrowingEnabled ? "as borrowable" : "supply-only"}, but new positions are blocked).`,
      inputs,
    };
  }

  let value: number;
  if (r.usageAsCollateralEnabled) value = clamp(Math.round(r.ltvPct * 1.1), 40, 95);
  else if (r.borrowingEnabled) value = 45;
  else value = 25;

  const role = r.usageAsCollateralEnabled
    ? `accepted as collateral (LTV ${r.ltvPct}%, liquidation threshold ${r.liquidationThresholdPct}%)`
    : r.borrowingEnabled
      ? "listed and borrowable, but not collateral"
      : "listed (supply only)";
  return {
    id: "borrowability",
    label: "Borrowability (Lendle)",
    status: "computed",
    value,
    explanation: `Lendle: ${role}. Supply APR ${r.supplyAprPct.toFixed(2)}%, variable borrow APR ${r.variableBorrowAprPct.toFixed(2)}%, utilization ${r.utilizationPct.toFixed(1)}%.`,
    inputs,
  };
}
