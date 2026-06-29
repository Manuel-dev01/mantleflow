import type { Sourced, SourceReceipt } from "../types/source-receipt.js";

/**
 * The Distribution Score engine's output types. Each sub-score is sourced and drillable.
 * Any sub-score the engine cannot source is reported `not-yet-computed` rather than guessed,
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

/** Basic token market facts — shown per asset so even illiquid assets surface real context
 * (price/mcap/FDV/24h volume from GeckoTerminal; total supply from the token contract). */
export interface AssetMarketFacts {
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
  /** Stringified to keep bigint out of the web-consumed type; null if unread. */
  totalSupply: string | null;
  decimals: number | null;
  receipts: SourceReceipt[];
}

export interface DistributionMap {
  asset: {
    symbol: string;
    name: string;
    address: string;
    network: "mainnet" | "sepolia";
  };
  /** Token market facts (price / mcap / FDV / 24h volume / supply), when sourced. */
  facts?: AssetMarketFacts | undefined;
  subScores: SubScore[];
  /** Composite 0..100 (weighted mean over computed sub-scores), or null when none computed. */
  composite: number | null;
  /** How the composite was derived (e.g. "partial — excludes cross-chain (insufficient data)"). */
  compositeNote?: string;
  /** Headline research findings — absences are signal (e.g. "No on-chain secondary venue"). */
  headlines: string[];
  generatedAt: string;
}

/** A detected compliance/transfer-restriction gate on a token. */
export interface ComplianceGate {
  /** False when the check could not run (e.g. Etherscan unavailable) — then the rest is meaningless. */
  determined: boolean;
  /** True only for a PERMISSIONED gate (allowlist / transfer-agent — must be approved to hold). */
  isGated: boolean;
  /** "permissioned" = approve-to-hold; "restrictable" = freely held unless blocked/sanctioned; null = open. */
  tier: "permissioned" | "restrictable" | null;
  /** e.g. "Securitize DS-Token transfer-agent allowlist", "Account blocklist / freeze". */
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
  /** Friendly DEX name (e.g. "Agni", "Merchant Moe (LB)") when known. */
  dex?: string | undefined;
  /** 24h trade volume in USD (from GeckoTerminal) when known. */
  volume24hUsd?: number | undefined;
  pairAddress?: string;
  receipt: SourceReceipt;
}
