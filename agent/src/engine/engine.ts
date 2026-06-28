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
import type { CrossChainReach } from "../adapters/crosschain.js";
import { depthSubScore } from "./subscores/depth.js";
import { fragmentationSubScore } from "./subscores/fragmentation.js";
import { borrowabilitySubScore } from "./subscores/borrowability.js";
import { crossChainSubScore } from "./subscores/crosschain.js";

function reachabilitySubScore(r: ReachabilityResult): SubScore {
  // Keep ALL venues in inputs (drillable); score over genuine TRADING venues only.
  const inputs: Sourced<unknown>[] = r.venues.map((v) => ({ value: v, receipt: v.receipt }));
  const yieldNote =
    r.yieldVenues.length > 0
      ? ` ${r.yieldVenues.length} yield/vault position(s) exist (${r.yieldVenues.map((v) => v.venue).join(", ")}) but are not exit liquidity — you cannot sell into a single-asset deposit.`
      : "";
  return {
    id: "reachability",
    label: "Secondary-market reachability",
    status: "computed",
    value: r.noSecondaryMarket ? 0 : Math.min(100, 25 + r.swapVenues.length * 25),
    explanation: r.noSecondaryMarket
      ? `No genuine secondary trading venue found via probed venues (Merchant Moe v2 factories + DefiLlama AMM pools).${yieldNote} Exit is via issuer redemption, not the open market — a core distribution friction.`
      : `Found ${r.swapVenues.length} trading venue(s): ${r.swapVenues.map((v) => v.venue).join(", ")}.${yieldNote}`,
    inputs,
  };
}

function complianceSubScore(g: Sourced<ComplianceGate>): SubScore {
  const gate = g.value;
  if (!gate.determined) {
    return {
      id: "compliance",
      label: "Compliance gating",
      status: "insufficient-data",
      value: null,
      explanation:
        "Compliance could not be source-verified (Etherscan unavailable). Not reported as gated or ungated — we do not guess.",
      inputs: [{ value: { determined: false }, receipt: g.receipt }],
    };
  }
  // Three tiers: permissioned (must be approved — strong gate), restrictable (freely held unless
  // blocked/sanctioned — a milder, standard control), or open. Scored 15 / 60 / 90.
  const value = gate.tier === "permissioned" ? 15 : gate.tier === "restrictable" ? 60 : 90;
  const explanation =
    gate.tier === "permissioned"
      ? `Holder is gated: ${gate.mechanism}. Transfers are restricted to approved wallets — most of the world is gated out, constraining distribution regardless of venue liquidity.`
      : gate.tier === "restrictable"
        ? `Freely transferable, but the issuer can block/freeze/sanction specific accounts (${gate.mechanism}). Normal holders are unaffected — a real but milder distribution control than an allowlist.`
        : "No allowlist / blocklist / transfer-agent / sanctions hooks detected; the token is freely transferable.";
  return {
    id: "compliance",
    label: "Compliance gating",
    status: "computed",
    value,
    explanation,
    inputs: gate.evidence as Sourced<unknown>[],
  };
}

/** Honest fallback when the cross-chain read couldn't run (kept out of the composite). */
function crossChainStub(): SubScore {
  return {
    id: "cross-chain",
    label: "Cross-chain reach",
    status: "insufficient-data",
    value: null,
    explanation: "Cross-chain reach could not be sourced this run (transient). Not scored — we never imply a value we have not sourced.",
    inputs: [],
  };
}

/** Composite weights over the sub-scores that can be computed (renormalised over those present). */
const WEIGHTS: Partial<Record<SubScoreId, number>> = {
  reachability: 0.25,
  "liquidity-depth": 0.2,
  fragmentation: 0.15,
  borrowability: 0.2,
  compliance: 0.2,
  "cross-chain": 0.15,
};

/** Minimum computed sub-scores (of 6) before we emit a composite number — below this a single
 * unreadable axis (e.g. compliance) would skew a hard score, so we show "—" + the note instead. */
const MIN_COMPOSITE_SUBSCORES = 3;

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
  const all: SubScoreId[] = ["reachability", "liquidity-depth", "fragmentation", "borrowability", "compliance", "cross-chain"];
  const excluded = all.filter((id) => !included.includes(id));
  if (weightSum === 0) return { value: null, included, note: "no sub-scores computed" };
  // A composite over too few axes is misleadingly precise (e.g. reachability 0 + borrowability 0 with
  // compliance unread reads as a hard "0/100" when compliance might be 90). Require at least 3 of 6.
  if (included.length < MIN_COMPOSITE_SUBSCORES) {
    return {
      value: null,
      included,
      note: `insufficient sub-scores for a composite — only ${included.length}/6 computed (${included.join(", ")}); not scored: ${excluded.join(", ")}`,
    };
  }
  return {
    value: Math.round(weighted / weightSum),
    included,
    note:
      excluded.length === 0
        ? `weighted mean over all ${included.length} sub-scores`
        : `partial — weighted mean over ${included.length} computed sub-scores; not scored: ${excluded.join(", ")}`,
  };
}

export interface AssembleInput {
  asset: DistributionMap["asset"];
  reachability: ReachabilityResult;
  liquidity: LiquidityResult;
  borrow: Sourced<LendleReserve>;
  compliance: Sourced<ComplianceGate>;
  /** Optional — when absent (or the read failed), cross-chain is reported insufficient-data. */
  crossChain?: CrossChainReach | undefined;
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
    input.crossChain ? crossChainSubScore(input.crossChain) : crossChainStub(),
  ];

  const comp = composite(subScores);

  const gate = input.compliance.value;
  const headlines: string[] = [];
  if (gate.determined && gate.tier === "permissioned") headlines.push(`Holder gated by ${gate.mechanism}`);
  else if (gate.determined && gate.tier === "restrictable") headlines.push(`Transferable, but blockable: ${gate.mechanism}`);
  if (input.reachability.noSecondaryMarket) headlines.push("No on-chain secondary trading venue found");
  if (!input.borrow.value.listed) headlines.push("Not borrowable on Lendle");
  if (headlines.length === 0 && gate.determined && gate.tier === null && !input.reachability.noSecondaryMarket)
    headlines.push("Freely transferable with a live trading venue");
  if (headlines.length === 0 && !input.reachability.noSecondaryMarket)
    headlines.push("Has a live trading venue"); // compliance undetermined — don't assert transferability
  if (headlines.length === 0) headlines.push("Distribution analysis complete");

  return {
    asset: input.asset,
    subScores,
    composite: comp.value,
    compositeNote: comp.note,
    headlines,
    generatedAt: input.generatedAt,
  };
}
