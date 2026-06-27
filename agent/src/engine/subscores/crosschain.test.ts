import { describe, expect, it } from "vitest";
import { crossChainSubScore } from "./crosschain.js";
import type { CrossChainReach, CrossChainRoute } from "../../adapters/crosschain.js";

const rcpt = { sourceName: "t", url: "", observedAt: "2026-06-27T00:00:00Z", kind: "fact" as const };
const route = (protocol: CrossChainRoute["protocol"], available: boolean): CrossChainRoute => ({
  protocol,
  available,
  detail: "",
  destinations: [],
  costUsd: null,
  receipt: rcpt,
});

describe("crossChainSubScore", () => {
  it("LayerZero OFT available → computed 70", () => {
    const reach: CrossChainReach = { routes: [route("LayerZero-OFT", true), route("CCIP", false)], anyRoute: true };
    const s = crossChainSubScore(reach);
    expect(s.status).toBe("computed");
    expect(s.value).toBe(70);
  });

  it("CCIP + OFT both available → 100 (capped)", () => {
    const reach: CrossChainReach = { routes: [route("LayerZero-OFT", true), route("CCIP", true)], anyRoute: true };
    expect(crossChainSubScore(reach).value).toBe(100);
  });

  it("nothing available → insufficient-data, null (excluded from composite)", () => {
    const reach: CrossChainReach = { routes: [route("LayerZero-OFT", false), route("CCIP", false)], anyRoute: false };
    const s = crossChainSubScore(reach);
    expect(s.status).toBe("insufficient-data");
    expect(s.value).toBeNull();
  });

  it("keeps every route (incl. negatives) as sourced inputs", () => {
    const reach: CrossChainReach = { routes: [route("LayerZero-OFT", false), route("CCIP", false)], anyRoute: false };
    expect(crossChainSubScore(reach).inputs).toHaveLength(2);
  });
});
