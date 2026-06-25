import { type Sourced } from "../types/source-receipt.js";
import {
  type ComplianceGate,
  type DistributionMap,
  type SubScore,
  type SubScoreId,
} from "./types.js";
import type { ReachabilityResult } from "../dex/reachability.js";

/** Sub-scores the Phase-1 engine actually computes. The rest are honestly not-yet-computed. */
const NOT_YET: { id: SubScoreId; label: string }[] = [
  { id: "liquidity-depth", label: "Liquidity depth (±2% of mid)" },
  { id: "fragmentation", label: "Fragmentation (HHI)" },
  { id: "borrowability", label: "Borrowability" },
  { id: "cross-chain", label: "Cross-chain reach" },
];

function reachabilitySubScore(r: ReachabilityResult): SubScore {
  const inputs: Sourced<unknown>[] = r.venues.map((v) => ({ value: v, receipt: v.receipt }));
  return {
    id: "reachability",
    label: "Secondary-market reachability",
    status: "computed",
    value: r.noSecondaryMarket ? 0 : Math.min(100, 25 + r.venues.length * 25),
    explanation: r.noSecondaryMarket
      ? "No live on-chain secondary venue found (checked Merchant Moe factories + DefiLlama pools). Exit is via issuer redemption, not the open market — a core distribution friction."
      : `Found ${r.venues.length} secondary venue(s): ${r.venues.map((v) => v.venue).join(", ")}.`,
    inputs,
  };
}

function complianceSubScore(g: Sourced<ComplianceGate>): SubScore {
  const gate = g.value;
  return {
    id: "compliance",
    label: "Compliance gating",
    status: "computed",
    // Distribution view: a hard transfer gate severely limits who can receive the asset.
    value: gate.isGated ? 15 : 90,
    explanation: gate.isGated
      ? `Holder is gated: ${gate.mechanism}. Transfers are restricted to permissioned wallets — this constrains distribution regardless of venue liquidity.`
      : "No transfer-restriction / allowlist / transfer-agent hooks detected; the token is freely transferable.",
    inputs: gate.evidence as Sourced<unknown>[],
  };
}

export interface AssembleInput {
  asset: DistributionMap["asset"];
  reachability: ReachabilityResult;
  compliance: Sourced<ComplianceGate>;
  generatedAt: string;
}

/**
 * Assemble the DistributionMap from computed inputs. Pure. Composite stays null in Phase 1 because
 * required depth/fragmentation/borrow/cross-chain sub-scores are not yet computed — the engine
 * refuses to emit a composite it cannot fully justify.
 */
export function assembleDistributionMap(input: AssembleInput): DistributionMap {
  const reachability = reachabilitySubScore(input.reachability);
  const compliance = complianceSubScore(input.compliance);
  const stubs: SubScore[] = NOT_YET.map((s) => ({
    id: s.id,
    label: s.label,
    status: "not-yet-computed",
    value: null,
    explanation: "Not yet computed (Phase 2/4). Shown to avoid implying a value we have not sourced.",
    inputs: [],
  }));

  const headlines: string[] = [];
  if (input.reachability.noSecondaryMarket) headlines.push("No on-chain secondary venue found");
  if (input.compliance.value.isGated)
    headlines.push(`Holder gated by ${input.compliance.value.mechanism}`);
  if (headlines.length === 0) headlines.push("Asset is freely transferable with a live secondary venue");

  return {
    asset: input.asset,
    subScores: [reachability, compliance, ...stubs],
    composite: null,
    headlines,
    generatedAt: input.generatedAt,
  };
}
