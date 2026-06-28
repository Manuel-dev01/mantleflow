import type { Sourced, SourceReceipt } from "../types/source-receipt.js";

/**
 * The Distribution Score engine's output types. Each sub-score is sourced and drillable.
 * Phase 1 computes `reachability` and `compliance`; the rest are honestly `not-yet-computed`
 * so the agent never fabricates depth/borrow/route numbers.
 */

export type SubScoreId =
  | "reachability"
  | "liquidity-depth"
  | "fragmentation"
  | "borrowability"
  | "cross-chain"
  | "compliance";

export type SubScoreStatus =
  | "computed"
  | "not-applicable"
  | "insufficient-data"
  | "not-yet-computed";

export interface SubScore {
  id: SubScoreId;
  label: string;
  status: SubScoreStatus;
  /** 0..100 where higher = better distribution; null unless status === "computed". */
  value: number | null;
  /** Plain-language explanation a judge can read. */
  explanation: string;
  /** The sourced inputs the value (or finding) was derived from. Every datum carries a receipt. */
  inputs: Sourced<unknown>[];
}

export interface DistributionMap {
  asset: {
    symbol: string;
    name: string;
    address: string;
    network: "mainnet" | "sepolia";
  };
  subScores: SubScore[];
  /** Composite 0..100 (weighted mean over computed sub-scores), or null when none computed. */
  composite: number | null;
  /** How the composite was derived (e.g. "partial — excludes cross-chain (Phase 4)"). */
  compositeNote?: string;
  /** Headline research findings — absences are signal (e.g. "No on-chain secondary venue"). */
  headlines: string[];
  generatedAt: string;
}

/** A detected compliance/transfer-restriction gate on a token. */
export interface ComplianceGate {
  /** False when the check could not run (e.g. Etherscan unavailable) — then isGated is meaningless. */
  determined: boolean;
  isGated: boolean;
  /** e.g. "Securitize DS-Token transfer-agent allowlist", "ERC-1404 transfer restriction". */
  mechanism: string | null;
  evidence: Sourced<string>[];
}

/** A secondary venue where the asset is present — a genuine trading venue (`swap`) or a
 * single-asset yield/lending/vault position (`yield`, not somewhere you can sell into). */
export interface SecondaryVenue {
  venue: string;
  kind: "dex-pair" | "dex-pool" | "cex" | "other";
  /** swap = a real trading venue counts toward reachability; yield = surfaced but not counted. */
  venueType: "swap" | "yield";
  /** Why it was classified swap vs yield (e.g. "exposure=single — yield/lending"). */
  classification?: string;
  pairAddress?: string;
  receipt: SourceReceipt;
}
