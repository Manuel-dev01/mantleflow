import { describe, it, expect } from "vitest";
import { assembleDistributionMap } from "./engine.js";

const asset = {
  symbol: "MI4",
  name: "Mantle Index Four",
  address: "0x671642ac281c760e34251d51bc9eef27026f3b7a",
  network: "mainnet" as const,
};
const ts = "2026-06-25T00:00:00.000Z";

describe("assembleDistributionMap", () => {
  it("treats no-secondary-market + gated as headline findings, composite null", () => {
    const map = assembleDistributionMap({
      asset,
      reachability: { venues: [], noSecondaryMarket: true },
      compliance: {
        value: {
          isGated: true,
          mechanism: "Securitize DS-Token transfer-agent allowlist",
          evidence: [],
        },
        receipt: { sourceName: "test", url: "", observedAt: ts, kind: "fact" },
      },
      generatedAt: ts,
    });

    expect(map.composite).toBeNull(); // refuses composite without all required sub-scores
    expect(map.headlines).toContain("No on-chain secondary venue found");
    expect(map.headlines.some((h) => h.includes("gated"))).toBe(true);

    const reach = map.subScores.find((s) => s.id === "reachability")!;
    expect(reach.status).toBe("computed");
    expect(reach.value).toBe(0);

    const comp = map.subScores.find((s) => s.id === "compliance")!;
    expect(comp.value).toBe(15);

    // The four uncomputed sub-scores are present and honestly labelled.
    const notYet = map.subScores.filter((s) => s.status === "not-yet-computed");
    expect(notYet).toHaveLength(4);
    expect(notYet.every((s) => s.value === null)).toBe(true);
  });

  it("computes a higher reachability value when venues exist", () => {
    const map = assembleDistributionMap({
      asset,
      reachability: {
        venues: [
          {
            venue: "Merchant Moe X/USDC",
            kind: "dex-pair",
            receipt: { sourceName: "test", url: "", observedAt: ts, kind: "fact" },
          },
        ],
        noSecondaryMarket: false,
      },
      compliance: {
        value: { isGated: false, mechanism: null, evidence: [] },
        receipt: { sourceName: "test", url: "", observedAt: ts, kind: "fact" },
      },
      generatedAt: ts,
    });
    const reach = map.subScores.find((s) => s.id === "reachability")!;
    expect(reach.value).toBeGreaterThan(0);
    expect(map.headlines).toContain("Asset is freely transferable with a live secondary venue");
  });
});
