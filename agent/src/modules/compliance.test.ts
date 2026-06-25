import { describe, it, expect } from "vitest";
import { detectGatesFromFunctions } from "./compliance.js";

describe("detectGatesFromFunctions", () => {
  it("detects Securitize DS-Token gating from transfer-agent functions", () => {
    const fns = ["transfer", "balanceOf", "preTransferCheck", "registryService"];
    expect(detectGatesFromFunctions(fns)).toContain(
      "Securitize DS-Token transfer-agent allowlist",
    );
  });

  it("detects ERC-1404 transfer restrictions", () => {
    const fns = ["transfer", "detectTransferRestriction", "messageForTransferRestriction"];
    expect(detectGatesFromFunctions(fns)).toContain("ERC-1404 transfer restriction");
  });

  it("returns no gates for a plain ERC-20", () => {
    const fns = ["transfer", "transferFrom", "approve", "balanceOf", "totalSupply"];
    expect(detectGatesFromFunctions(fns)).toEqual([]);
  });

  it("detects allowlist gating", () => {
    expect(detectGatesFromFunctions(["isWhitelisted"])).toContain("Allowlist / whitelist gating");
  });
});
