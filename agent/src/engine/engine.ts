import { type Sourced } from "../types/source-receipt.js";
import {
  type ComplianceGate,
  type DistributionMap,
  type SubScore,
  type SubScoreId,
} from "./types.js";
import type { ReachabilityResult } from "../dex/reachability.js";
import type { LiquidityResult } from "../dex/depth.js";
import type { LendleReserve } from "../adapters/lendle.js";
import { depthSubScore } from "./subscores/depth.js";
import { fragmentationSubScore } from "./subscores/fragmentation.js";
import { borrowabilitySubScore } from "./subscores/borrowability.js";

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
    value: gate.isGated ? 15 : 90,
    explanation: gate.isGated
      ? `Holder is gated: ${gate.mechanism}. Transfers are restricted to permissioned wallets — this constrains distribution regardless of venue liquidity.`
      : "No transfer-restriction / allowlist / transfer-agent hooks detected; the token is freely transferable.",
    inputs: gate.evidence as Sourced<unknown>[],
  };
}

/** Cross-chain reach is wired in Phase 4 — kept honest as not-yet-computed. */
function crossChainStub(): SubScore {
  return {
    id: "cross-chain",
    label: "Cross-chain reach",
    status: "not-yet-computed",
    value: null,
    explanation: "Not yet computed (Phase 4: CCIP/bridge route + cost). Shown to avoid implying a value we have not sourced.",
    inputs: [],
  };
}

/** Composite weights over the sub-scores that can be computed. Cross-chain excluded until Phase 4. */
const WEIGHTS: Partial<Record<SubScoreId, number>> = {
  reachability: 0.25,
  "liquidity-depth": 0.2,
  fragmentation: 0.15,
  borrowability: 0.2,
  compliance: 0.2,
};

interface Composite {
  value: number | null;
  included: SubScoreId[];
  note: string;
}

/** Weighted mean over `computed` sub-scores, renormalising weights among those present. */
function composite(subScores: SubScore[]): Composite {
  let weighted = 0;
  let weightSum = 0;
  const included: SubScoreId[] = [];
  for (const s of subScores) {
    const w = WEIGHTS[s.id];
    if (s.status === "computed" && s.value !== null && w) {
      weighted += w * s.value;
      weightSum += w;
      included.push(s.id);
    }
  }
  if (weightSum === 0) return { value: null, included, note: "no sub-scores computed" };
  return {
    value: Math.round(weighted / weightSum),
    included,
    note: "partial — excludes cross-chain (Phase 4)" + (included.length < 5 ? " and not-applicable sub-scores" : ""),
  };
}

export interface AssembleInput {
  asset: DistributionMap["asset"];
  reachability: ReachabilityResult;
  liquidity: LiquidityResult;
  borrow: Sourced<LendleReserve>;
  compliance: Sourced<ComplianceGate>;
  generatedAt: string;
}

/**
 * Assemble the DistributionMap. Pure. Computes reachability, depth, fragmentation, borrowability and
 * compliance; cross-chain stays not-yet-computed. The composite is a weighted mean over the
 * computed sub-scores, explicitly labelled partial — the engine never invents a sub-score it lacks.
 */
export function assembleDistributionMap(input: AssembleInput): DistributionMap {
  const subScores: SubScore[] = [
    reachabilitySubScore(input.reachability),
    depthSubScore(input.liquidity),
    fragmentationSubScore(input.liquidity),
    borrowabilitySubScore(input.borrow),
    complianceSubScore(input.compliance),
    crossChainStub(),
  ];

  const comp = composite(subScores);

  const headlines: string[] = [];
  if (input.reachability.noSecondaryMarket) headlines.push("No on-chain secondary venue found");
  if (input.compliance.value.isGated)
    headlines.push(`Holder gated by ${input.compliance.value.mechanism}`);
  if (!input.borrow.value.listed) headlines.push("Not borrowable on Lendle");
  if (headlines.length === 0 && !input.reachability.noSecondaryMarket)
    headlines.push("Freely transferable with a live secondary venue");

  return {
    asset: input.asset,
    subScores,
    composite: comp.value,
    compositeNote: comp.note,
    headlines,
    generatedAt: input.generatedAt,
  };
}
