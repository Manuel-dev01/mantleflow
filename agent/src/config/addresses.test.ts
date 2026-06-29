import { describe, it, expect } from "vitest";
import { ERC8004, TRACKED_ASSETS, USDC_MANTLE_MAINNET } from "./addresses.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

describe("verified addresses are well-formed", () => {
  it("ERC-8004 identity/reputation registries on both networks are valid addresses", () => {
    for (const net of ["mainnet", "sepolia"] as const) {
      expect(ERC8004[net].identity).toMatch(ADDRESS_RE);
      expect(ERC8004[net].reputation).toMatch(ADDRESS_RE);
      // Validation registry is intentionally absent on Mantle.
      expect(ERC8004[net].validation).toBeNull();
    }
  });

  it("USDC settlement asset is a valid address", () => {
    expect(USDC_MANTLE_MAINNET).toMatch(ADDRESS_RE);
  });

  it("MI4 is tracked with verified metadata", () => {
    const mi4 = TRACKED_ASSETS.MI4;
    expect(mi4).toBeDefined();
    expect(mi4!.address).toMatch(ADDRESS_RE);
    expect(mi4!.decimals).toBe(6);
    expect(mi4!.isProxy).toBe(true);
  });
});
