import { describe, it, expect } from "vitest";
import { fragmentationSubScore } from "./fragmentation.js";
import { borrowabilitySubScore } from "./borrowability.js";
import { liquidityBand } from "./util.js";
import { decodeLendleReserve, type LendleReserve } from "../../adapters/lendle.js";
import type { LiquidityResult } from "../../dex/depth.js";

const rcpt = { sourceName: "t", url: "", observedAt: "2026-06-26T00:00:00Z", kind: "fact" as const };
const venue = (liquidityUsd: number) => ({
  venue: "v",
  liquidityUsd,
  depthUsdAt2pct: null,
  slipPctAt250k: null,
  method: "tvl-proxy" as const,
  venueType: "swap" as const,
  receipt: rcpt,
});
/** LiquidityResult over swap venues (the only ones the depth/fragmentation sub-scores score). */
const liqOf = (venues: ReturnType<typeof venue>[]): LiquidityResult => ({
  venues,
  swapVenues: venues,
  yieldVenues: [],
  totalLiquidityUsd: venues.reduce((s, v) => s + v.liquidityUsd, 0),
  totalDepthUsdAt2pct: 0,
});

describe("fragmentation HHI", () => {
  it("single venue → HHI 10000 → value 0 (fully concentrated)", () => {
    const s = fragmentationSubScore(liqOf([venue(1000)]));
    expect(s.value).toBe(0);
    expect(s.explanation).toContain("10000");
  });
  it("two equal venues → HHI 5000 → value 50", () => {
    expect(fragmentationSubScore(liqOf([venue(500), venue(500)])).value).toBe(50);
  });
  it("no venues → not-applicable", () => {
    expect(fragmentationSubScore(liqOf([])).status).toBe("not-applicable");
  });
});

describe("liquidityBand", () => {
  it("bands by magnitude", () => {
    expect(liquidityBand(0)).toBe(0);
    expect(liquidityBand(5_000)).toBe(10);
    expect(liquidityBand(500_000)).toBe(55);
    expect(liquidityBand(50_000_000)).toBe(95);
  });
});

describe("borrowability", () => {
  const base: LendleReserve = {
    listed: true,
    usageAsCollateralEnabled: true,
    borrowingEnabled: true,
    isFrozen: false,
    ltvPct: 70,
    liquidationThresholdPct: 75,
    supplyAprPct: 2,
    variableBorrowAprPct: 3,
    utilizationPct: 40,
    availableLiquidity: 0n,
    totalDebt: 0n,
    reserveDecimals: 18,
  };
  it("not listed → 0", () => {
    const s = borrowabilitySubScore({ value: { ...base, listed: false }, receipt: rcpt });
    expect(s.value).toBe(0);
    expect(s.explanation).toContain("Not listed");
  });
  it("collateral → scales with LTV", () => {
    expect(borrowabilitySubScore({ value: base, receipt: rcpt }).value!).toBeGreaterThanOrEqual(60);
  });
  it("frozen reserve → low score (≤20) even when collateral-enabled, with FROZEN explanation", () => {
    const s = borrowabilitySubScore({ value: { ...base, isFrozen: true }, receipt: rcpt });
    expect(s.value!).toBeLessThanOrEqual(20);
    expect(s.explanation).toContain("FROZEN");
  });
});

describe("decodeLendleReserve", () => {
  it("decodes config + state into human fields (rates from ray, ltv from bps)", () => {
    const cfg = [18n, 7500n, 8000n, 10500n, 1000n, true, true, false, true, false] as const;
    // availableLiquidity, stableDebt, variableDebt, liquidityRate(ray ~5%), variableBorrowRate(ray ~8%), ...
    const data = [
      1000n,
      0n,
      1000n,
      50_000_000_000_000_000_000_000_000n,
      80_000_000_000_000_000_000_000_000n,
      0n,
      0n,
      0n,
      0n,
      0,
    ] as const;
    const r = decodeLendleReserve(cfg, data);
    expect(r.listed).toBe(true);
    expect(r.ltvPct).toBe(75);
    expect(r.liquidationThresholdPct).toBe(80);
    expect(Math.round(r.supplyAprPct)).toBe(5);
    expect(Math.round(r.variableBorrowAprPct)).toBe(8);
    expect(r.utilizationPct).toBe(50); // 1000 debt / (1000 avail + 1000 debt)
  });
});
