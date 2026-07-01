import { describe, it, expect } from "vitest";
import { createGeckoTerminalAdapter } from "./geckoterminal.js";

const ts = "2026-06-27T00:00:00.000Z";
const METH = "0xcDA86A272531e8640cD7F1a92c01839911B90bb0";

describe("GeckoTerminal adapter", () => {
  const gt = createGeckoTerminalAdapter();

  it("returns no pools for non-mainnet networks (GT indexes mainnet only) — no network call", async () => {
    const r = await gt.poolsForToken("sepolia", METH, ts);
    expect(r.value).toEqual([]);
    expect(r.receipt.sourceName).toContain("GeckoTerminal");
  });

  it("returns empty market for non-mainnet networks", async () => {
    const r = await gt.tokenMarket("sepolia", METH, ts);
    expect(r.value).toEqual({
      name: null, symbol: null, decimals: null, imageUrl: null, coingeckoId: null,
      priceUsd: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null,
    });
  });
});
