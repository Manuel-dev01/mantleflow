import { describe, it, expect } from "vitest";
import { detectGatesFromFunctions } from "./compliance.js";

describe("detectGatesFromFunctions", () => {
  const mechs = (fns: string[]) => detectGatesFromFunctions(fns).map((g) => g.mechanism);

  it("detects Securitize DS-Token gating as a PERMISSIONED tier", () => {
    const g = detectGatesFromFunctions(["transfer", "balanceOf", "preTransferCheck", "registryService"]);
    expect(g.some((x) => x.mechanism === "Securitize DS-Token transfer-agent allowlist" && x.tier === "permissioned")).toBe(true);
  });

  it("detects ERC-1404 transfer restrictions (permissioned)", () => {
    expect(mechs(["transfer", "detectTransferRestriction", "messageForTransferRestriction"])).toContain("ERC-1404 transfer restriction");
  });

  it("returns no gates for a plain ERC-20", () => {
    expect(detectGatesFromFunctions(["transfer", "transferFrom", "approve", "balanceOf", "totalSupply"])).toEqual([]);
  });

  it("detects allowlist gating (permissioned)", () => {
    expect(mechs(["isWhitelisted"])).toContain("Allowlist / whitelist / KYC gating");
  });

  it("detects per-account blocklist/freeze as RESTRICTABLE (fBTC lockUser/userBlocked, USDY blocklist)", () => {
    const fbtc = detectGatesFromFunctions(["transfer", "lockUser", "userBlocked"]);
    expect(fbtc.some((x) => x.mechanism === "Account blocklist / freeze" && x.tier === "restrictable")).toBe(true);
    expect(mechs(["blocklist", "setBlocklist"])).toContain("Account blocklist / freeze");
  });

  it("detects sanctions screening as RESTRICTABLE (cmETH)", () => {
    const g = detectGatesFromFunctions(["isSanctioned", "sanctionsList"]);
    expect(g.some((x) => x.mechanism === "Sanctions screening" && x.tier === "restrictable")).toBe(true);
  });

  it("does NOT gate on global pause alone (a pausable token is not holder-gated)", () => {
    expect(detectGatesFromFunctions(["transfer", "pause", "unpause", "paused"])).toEqual([]);
  });
});
