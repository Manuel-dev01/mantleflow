/**
 * Pure helpers that read a live `DistributionMap` and shape it for the brutalist UI panels.
 *
 * Every value returned here is traced back to a real sub-score input and carries (or can carry) its
 * `SourceReceipt`. Where the backend hasn't computed something yet (cross-chain routes, per-$250k
 * slippage on TVL-proxy venues, per-jurisdiction gates) these helpers return `null` / honest flags
 * so the UI can render a "not-yet-computed" state instead of inventing a number.
 */
import type {
  DistributionMap,
  SubScore,
  SubScoreId,
  SubScoreStatus,
  Sourced,
  SourceReceipt,
  SecondaryVenue,
  VenueLiquidity,
  CrossChainRoute,
} from "@mantleflow/agent";

export function subOf(map: DistributionMap, id: SubScoreId): SubScore | undefined {
  return map.subScores.find((s) => s.id === id);
}

/** Secondary venues from the reachability sub-score (each input value is a SecondaryVenue). */
export function venuesOf(map: DistributionMap): SecondaryVenue[] {
  return (subOf(map, "reachability")?.inputs ?? []).map((i) => i.value as SecondaryVenue);
}

/** Per-venue liquidity from the liquidity-depth sub-score. */
export function liquidityOf(map: DistributionMap): VenueLiquidity[] {
  return (subOf(map, "liquidity-depth")?.inputs ?? []).map((i) => i.value as VenueLiquidity);
}

/** Cross-chain routes (incl. negative/checked results) from the cross-chain sub-score. */
export function routesOf(map: DistributionMap): {
  routes: CrossChainRoute[];
  status: SubScoreStatus;
  value: number | null;
  explanation: string;
} {
  const s = subOf(map, "cross-chain");
  return {
    routes: (s?.inputs ?? []).map((i) => i.value as CrossChainRoute),
    status: s?.status ?? "not-yet-computed",
    value: s?.value ?? null,
    explanation: s?.explanation ?? "",
  };
}

export interface BorrowSummary {
  listed: boolean;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  ltvPct: number;
  liquidationThresholdPct: number;
  supplyAprPct: number;
  variableBorrowAprPct: number;
  utilizationPct: number;
  isFrozen: boolean;
}

export function borrowOf(map: DistributionMap): { value: BorrowSummary; receipt: SourceReceipt } | null {
  const input = subOf(map, "borrowability")?.inputs?.[0];
  if (!input) return null;
  return { value: input.value as BorrowSummary, receipt: input.receipt };
}

export interface ComplianceView {
  status: SubScoreStatus;
  determined: boolean;
  /** true = gated, false = open, null = could not source-verify */
  isGated: boolean | null;
  mechanism: string | null;
  explanation: string;
  evidence: Sourced<string>[];
}

export function complianceOf(map: DistributionMap): ComplianceView | null {
  const s = subOf(map, "compliance");
  if (!s) return null;
  const determined = s.status !== "insufficient-data";
  const isGated = s.value == null ? null : s.value <= 50;
  const m = s.explanation.match(/gated:\s*([^.]+)\./);
  return {
    status: s.status,
    determined,
    isGated,
    mechanism: m?.[1]?.trim() ?? null,
    explanation: s.explanation,
    evidence: (s.inputs as Sourced<unknown>[]).map((i) => i as Sourced<string>),
  };
}

// ---- Overview stats ---------------------------------------------------------

export interface Stat {
  value: string;
  /** acid = good/open, paper = neutral/blocked, mut = unknown */
  tone: "acid" | "paper" | "mut";
  receipt?: SourceReceipt;
}

export interface OverviewStats {
  venues: Stat;
  depth: Stat;
  bestSlip: Stat;
  holding: Stat;
}

function fmtUsdLocal(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export function overviewStats(map: DistributionMap): OverviewStats {
  const liq = liquidityOf(map);
  const comp = complianceOf(map);

  // Count + sum only genuine TRADING venues — yield/vault positions aren't exit liquidity.
  const swapVenues = venuesOf(map).filter((v) => v.venueType === "swap");
  const swapLiq = liq.filter((v) => v.venueType === "swap");
  const venueCount = swapVenues.length;
  const totalDepth = swapLiq.reduce((s, v) => s + (v.liquidityUsd || 0), 0);

  // Best (lowest) real $250k clearing slip across CPMM venues.
  const slips = swapLiq.map((v) => v.slipPctAt250k).filter((x): x is number => x != null);
  const bestSlip = slips.length ? Math.min(...slips) : null;
  const bestSlipVenue = liq.find((v) => v.slipPctAt250k != null && v.slipPctAt250k === bestSlip);

  const holding: Stat =
    comp == null || comp.isGated == null
      ? { value: "UNVERIFIED", tone: "mut", receipt: comp?.evidence[0]?.receipt }
      : comp.isGated
        ? { value: "GATED", tone: "paper", receipt: comp.evidence[0]?.receipt }
        : { value: "OPEN", tone: "acid", receipt: comp.evidence[0]?.receipt };

  return {
    venues: {
      value: String(venueCount),
      tone: venueCount > 0 ? "paper" : "mut",
      receipt: swapVenues[0]?.receipt ?? subOf(map, "reachability")?.inputs[0]?.receipt,
    },
    depth: {
      value: totalDepth > 0 ? fmtUsdLocal(totalDepth) : "—",
      tone: "paper",
      receipt: subOf(map, "liquidity-depth")?.inputs[0]?.receipt,
    },
    bestSlip: {
      value: bestSlip != null ? `${bestSlip.toFixed(2)}%` : "—",
      tone: bestSlip != null && bestSlip < 1 ? "acid" : "paper",
      receipt: bestSlipVenue?.receipt,
    },
    holding,
  };
}

// ---- Radial distribution map ------------------------------------------------

/** Fixed aesthetic node slots from the design (% coordinates inside the SVG box). */
const SLOTS = [
  { x: 24, y: 18 },
  { x: 74, y: 15 },
  { x: 88, y: 44 },
  { x: 84, y: 78 },
  { x: 50, y: 90 },
  { x: 14, y: 80 },
  { x: 10, y: 48 },
  { x: 36, y: 66 },
  { x: 60, y: 32 },
];

export type NodeStatus = "deep" | "thin" | "gated" | "pending" | "bridge" | "yield";

export interface MapNode {
  label: string;
  meta: string;
  status: NodeStatus;
  x: number;
  y: number;
  receipt?: SourceReceipt;
}

/**
 * Build radial nodes from REAL data: trading venues (deep/thin by USD), yield/vault positions
 * (distinct, not exit liquidity), a Lendle collateral node, a compliance "GATED" node, and the
 * cross-chain node(s) built from the actual computed routes (no "Phase 4" stub).
 */
export function buildMapNodes(map: DistributionMap): MapNode[] {
  const liq = [...liquidityOf(map)].sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  const nodes: MapNode[] = [];

  // Genuine trading venues first (the only ones that read as tradeable depth).
  for (const v of liq.filter((x) => x.venueType === "swap")) {
    const deep = v.method === "cpmm-exact" || v.liquidityUsd >= 1_000_000;
    nodes.push({
      label: v.venue.replace(/ ·\/.*$/, "").replace(/ pool$/i, ""),
      meta: v.liquidityUsd > 0 ? fmtUsdLocal(v.liquidityUsd) : v.method,
      status: deep ? "deep" : "thin",
      x: 0,
      y: 0,
      receipt: v.receipt,
    });
  }

  // Yield/vault positions — surfaced, but visually distinct (not somewhere you can sell into).
  for (const v of liq.filter((x) => x.venueType === "yield")) {
    nodes.push({
      label: v.venue.replace(/ ·\/.*$/, "").replace(/ pool$/i, ""),
      meta: `YIELD ${v.liquidityUsd > 0 ? fmtUsdLocal(v.liquidityUsd) : ""}`.trim(),
      status: "yield",
      x: 0,
      y: 0,
      receipt: v.receipt,
    });
  }

  const borrow = borrowOf(map);
  if (borrow?.value.listed) {
    const frozen = borrow.value.isFrozen;
    nodes.push({
      label: "Lendle",
      meta: frozen ? "FROZEN" : borrow.value.usageAsCollateralEnabled ? `COLLATERAL ${borrow.value.ltvPct}%` : "LISTED",
      status: frozen ? "thin" : borrow.value.usageAsCollateralEnabled ? "deep" : "thin",
      x: 0,
      y: 0,
      receipt: borrow.receipt,
    });
  }

  const comp = complianceOf(map);
  if (comp?.isGated) {
    nodes.push({
      label: comp.mechanism ? comp.mechanism.split(" ").slice(0, 2).join(" ") : "Gated",
      meta: "GATED",
      status: "gated",
      x: 0,
      y: 0,
      receipt: comp.evidence[0]?.receipt,
    });
  }

  // Cross-chain — built from the REAL computed routes (D21), not a placeholder.
  const xc = routesOf(map);
  const available = xc.routes.filter((r) => r.available);
  if (available.length > 0) {
    for (const r of available) {
      nodes.push({
        label: r.protocol.replace(/-OFT$/, ""),
        meta: "BRIDGE",
        status: "bridge",
        x: 0,
        y: 0,
        receipt: r.receipt,
      });
    }
  } else if (xc.routes.length > 0) {
    // Probed both channels, none available — a real "no permissionless bridge" finding.
    nodes.push({ label: "Cross-chain", meta: "NO ROUTE", status: "gated", x: 0, y: 0, receipt: xc.routes[0]?.receipt });
  } else {
    // Not sourced this run (transient) — honest peripheral node, never a fabricated route.
    nodes.push({ label: "Cross-chain", meta: "not sourced", status: "pending", x: 0, y: 0 });
  }

  // Assign slots (cap at 9).
  return nodes.slice(0, SLOTS.length).map((n, i) => ({ ...n, ...SLOTS[i] }));
}

/** Visual style per node status — ported from the design's `mk()`. */
export function nodeStyle(status: NodeStatus): {
  stroke: string;
  width: number;
  dash: string;
  opacity: number;
  flow: boolean;
  fill: string;
  border: string;
  mark: string;
  labelTone: "paper" | "mut" | "mut2";
} {
  switch (status) {
    case "deep":
      return { stroke: "#C8F24E", width: 2.4, dash: "0", opacity: 0.95, flow: true, fill: "#C8F24E", border: "2px solid #C8F24E", mark: "", labelTone: "paper" };
    case "thin":
      return { stroke: "#6F6F68", width: 1.4, dash: "0", opacity: 0.45, flow: false, fill: "transparent", border: "2px solid #6F6F68", mark: "", labelTone: "paper" };
    case "gated":
      return { stroke: "#6F6F68", width: 1.6, dash: "4 4", opacity: 0.55, flow: false, fill: "transparent", border: "2px solid #6F6F68", mark: "✕", labelTone: "mut" };
    case "bridge":
      return { stroke: "#C8F24E", width: 2, dash: "6 4", opacity: 0.9, flow: true, fill: "transparent", border: "2px solid #C8F24E", mark: "⤳", labelTone: "paper" };
    case "yield":
      return { stroke: "#6F6F68", width: 1.2, dash: "1 5", opacity: 0.4, flow: false, fill: "transparent", border: "2px dotted #6F6F68", mark: "%", labelTone: "mut" };
    case "pending":
      return { stroke: "#6F6F68", width: 1.2, dash: "2 6", opacity: 0.35, flow: false, fill: "transparent", border: "2px dashed #6F6F68", mark: "·", labelTone: "mut2" };
  }
}
