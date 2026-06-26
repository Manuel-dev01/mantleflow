import { fetchJson } from "../lib/http.js";
import { type Sourced, sourced } from "../types/source-receipt.js";

/**
 * DefiLlama coins adapter (keyless): USD price for a Mantle token. Used to convert on-chain
 * reserves and lending liquidity into USD for the depth and borrowability sub-scores.
 */
export interface PriceData {
  priceUsd: number;
  symbol?: string | undefined;
  decimals?: number | undefined;
  confidence?: number | undefined;
}

export interface PriceAdapter {
  /** Returns null (sourced) when DefiLlama has no price for the token. */
  getPrice(address: string, observedAt: string): Promise<Sourced<PriceData | null>>;
}

interface LlamaCoinsResponse {
  coins: Record<
    string,
    { price: number; symbol?: string; decimals?: number; confidence?: number }
  >;
}

export function createPriceAdapter(chain = "mantle"): PriceAdapter {
  return {
    async getPrice(address, observedAt) {
      const key = `${chain}:${address}`;
      const url = `https://coins.llama.fi/prices/current/${key}`;
      const res = await fetchJson<LlamaCoinsResponse>(url, { ttlMs: 60_000 });
      const c = res.coins?.[key];
      const value: PriceData | null = c
        ? { priceUsd: c.price, symbol: c.symbol, decimals: c.decimals, confidence: c.confidence }
        : null;
      return sourced(value, {
        sourceName: "DefiLlama (coins)",
        url,
        observedAt,
        kind: "fact",
        note: c ? `price $${c.price} (confidence ${c.confidence ?? "n/a"})` : "no price found",
      });
    },
  };
}
