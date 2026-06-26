import type { Sourced } from "../../types/source-receipt.js";
import type { LendleReserve } from "../../adapters/lendle.js";
import type { SubScore } from "../types.js";
import { clamp } from "./util.js";

/** Borrowability sub-score from a Lendle reserve read. Not-listed is a finding, scored 0. */
export function borrowabilitySubScore(reserve: Sourced<LendleReserve>): SubScore {
  const r = reserve.value;
  const inputs: Sourced<unknown>[] = [{ value: r, receipt: reserve.receipt }];

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
    explanation: `Lendle: ${role}. Supply APR ${r.supplyAprPct.toFixed(2)}%, variable borrow APR ${r.variableBorrowAprPct.toFixed(2)}%, utilization ${r.utilizationPct.toFixed(1)}%${r.isFrozen ? " (reserve frozen)" : ""}.`,
    inputs,
  };
}
