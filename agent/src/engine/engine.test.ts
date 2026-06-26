import { describe, it, expect } from "vitest";
import { assembleDistributionMap, type AssembleInput } from "./engine.js";
import type { LendleReserve } from "../adapters/lendle.js";
import type { LiquidityResult } from "../dex/depth.js";

const asset = {
  symbol: "MI4",
  name: "Mantle Index Four",
  address: "0x671642ac281c760e34251d51bc9eef27026f3b7a",
  network: "mainnet" as const,
};
const ts = "2026-06-26T00:00:00.000Z";
const rcpt = { sourceName: "test", url: "", observedAt: ts, kind: "fact" as const };

const emptyLiquidity: LiquidityResult = { venues: [], totalLiquidityUsd: 0, totalDepthUsdAt2pct: 0 };
const notListed = (): { value: LendleReserve; receipt: typeof rcpt } => ({
  value: {
    listed: false,
    usageAsCollateralEnabled: false,
    borrowingEnabled: false,
    isFrozen: false,
    ltvPct: 0,
    liquidationThresholdPct: 0,
    supplyAprPct: 0,
    variableBorrowAprPct: 0,
    utilizationPct: 0,
    availableLiquidity: 0n,
    totalDebt: 0n,
    reserveDecimals: 0,
  },
  receipt: rcpt,
});

describe("assembleDistributionMap", () => {
  it("MI4-like: no venue + gated + not borrowable → low composite, headline findings", () => {
    const input: AssembleInput = {
      asset,
      reachability: { venues: [], noSecondaryMarket: true },
      liquidity: emptyLiquidity,
      borrow: notListed(),
      compliance: {
        value: { determined: true, isGated: true, mechanism: "Securitize DS-Token transfer-agent allowlist", evidence: [] },
        receipt: rcpt,
      },
      generatedAt: ts,
    };
    const map = assembleDistributionMap(input);

    expect(map.headlines).toContain("No on-chain secondary venue found");
    expect(map.headlines.some((h) => h.includes("gated"))).toBe(true);
    expect(map.headlines).toContain("Not borrowable on Lendle");

    // depth + fragmentation are not-applicable (no venues); reachability/borrow=0, compliance=15
    expect(map.subScores.find((s) => s.id === "liquidity-depth")!.status).toBe("not-applicable");
    expect(map.subScores.find((s) => s.id === "borrowability")!.value).toBe(0);
    expect(map.subScores.find((s) => s.id === "cross-chain")!.status).toBe("not-yet-computed");

    // partial composite over the 3 computed sub-scores (reachability 0, borrow 0, compliance 15)
    expect(map.composite).not.toBeNull();
    expect(map.composite!).toBeLessThan(20);
    expect(map.compositeNote).toMatch(/partial/i);
  });

  it("undetermined compliance → insufficient-data, never a false 'freely transferable'", () => {
    const map = assembleDistributionMap({
      asset,
      reachability: { venues: [], noSecondaryMarket: true },
      liquidity: emptyLiquidity,
      borrow: notListed(),
      compliance: { value: { determined: false, isGated: false, mechanism: null, evidence: [] }, receipt: rcpt },
      generatedAt: ts,
    });
    const c = map.subScores.find((s) => s.id === "compliance")!;
    expect(c.status).toBe("insufficient-data");
    expect(c.value).toBeNull();
    expect(map.headlines.join(" ")).not.toMatch(/freely transferable/i);
  });

  it("liquid asset: venues + collateral → higher composite", () => {
    const liquidity: LiquidityResult = {
      venues: [
        { venue: "Merchant Moe ·/USDC", liquidityUsd: 5_000_000, depthUsdAt2pct: 49_750, slipPctAt250k: 4.76, method: "cpmm-exact", receipt: rcpt },
        { venue: "Agni pool", liquidityUsd: 3_000_000, depthUsdAt2pct: null, slipPctAt250k: null, method: "tvl-proxy", receipt: rcpt },
      ],
      totalLiquidityUsd: 8_000_000,
      totalDepthUsdAt2pct: 49_750,
    };
    const input: AssembleInput = {
      asset: { ...asset, symbol: "mETH", name: "Mantle Staked Ether" },
      reachability: {
        venues: [{ venue: "Merchant Moe ·/USDC", kind: "dex-pair", receipt: rcpt }],
        noSecondaryMarket: false,
      },
      liquidity,
      borrow: {
        value: { ...notListed().value, listed: true, usageAsCollateralEnabled: true, borrowingEnabled: true, ltvPct: 70, liquidationThresholdPct: 75, supplyAprPct: 2.1, variableBorrowAprPct: 3.4, utilizationPct: 40, reserveDecimals: 18 },
        receipt: rcpt,
      },
      compliance: { value: { determined: true, isGated: false, mechanism: null, evidence: [] }, receipt: rcpt },
      generatedAt: ts,
    };
    const map = assembleDistributionMap(input);
    expect(map.subScores.find((s) => s.id === "liquidity-depth")!.status).toBe("computed");
    expect(map.subScores.find((s) => s.id === "fragmentation")!.status).toBe("computed");
    expect(map.subScores.find((s) => s.id === "borrowability")!.value!).toBeGreaterThan(60);
    expect(map.composite!).toBeGreaterThan(60);
  });
});
