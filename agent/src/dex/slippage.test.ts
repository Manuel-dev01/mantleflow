import { describe, expect, it } from "vitest";
import { cpmmSlippagePct, STANDARD_CLEAR_SIZE_USD } from "./slippage.js";

describe("cpmmSlippagePct", () => {
  it("is small for a deep pool relative to the trade", () => {
    // $250k into a $25M side ≈ 0.99%
    const slip = cpmmSlippagePct(25_000_000, STANDARD_CLEAR_SIZE_USD);
    expect(slip).toBeCloseTo((250_000 / 25_250_000) * 100, 6);
    expect(slip).toBeLessThan(1.5);
  });

  it("grows as the pool thins", () => {
    const deep = cpmmSlippagePct(10_000_000, 250_000);
    const thin = cpmmSlippagePct(1_000_000, 250_000);
    expect(thin).toBeGreaterThan(deep);
    // $250k into a $1M side = 250k/1.25M = 20%
    expect(thin).toBeCloseTo(20, 6);
  });

  it("returns 100 for an empty reserve (any trade drains it)", () => {
    expect(cpmmSlippagePct(0, 250_000)).toBe(100);
    expect(cpmmSlippagePct(-5, 250_000)).toBe(100);
  });

  it("returns 0 for a non-positive trade size", () => {
    expect(cpmmSlippagePct(1_000_000, 0)).toBe(0);
  });

  it("matches the closed-form tradeUsd/(reserve+tradeUsd)", () => {
    const r = 4_230_000;
    const t = 250_000;
    expect(cpmmSlippagePct(r, t)).toBeCloseTo((t / (r + t)) * 100, 9);
  });
});
