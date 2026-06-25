import { fetchJson } from "../lib/http.js";
import { type Sourced, sourced } from "../types/source-receipt.js";

/**
 * DefiLlama adapter (keyless). Used to cross-check secondary-market reachability: if a token does
 * not appear in any Mantle pool, that's a strong "no liquid secondary venue" signal.
 */
const YIELDS_POOLS = "https://yields.llama.fi/pools";

interface LlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  pool: string;
  underlyingTokens?: string[] | null;
}

export interface LlamaPoolMatch {
  project: string;
  symbol: string;
  tvlUsd: number;
  pool: string;
}

export interface DefiLlamaAdapter {
  /** Pools on Mantle whose underlying tokens include `tokenAddress` (case-insensitive). */
  poolsForToken(
    tokenAddress: string,
    observedAt: string,
  ): Promise<Sourced<LlamaPoolMatch[]>>;
}

export function createDefiLlamaAdapter(): DefiLlamaAdapter {
  return {
    async poolsForToken(tokenAddress, observedAt) {
      const data = await fetchJson<{ data: LlamaPool[] }>(YIELDS_POOLS, {
        ttlMs: 5 * 60_000,
        timeoutMs: 30_000,
      });
      const needle = tokenAddress.toLowerCase();
      const matches: LlamaPoolMatch[] = (data.data ?? [])
        .filter(
          (p) =>
            p.chain === "Mantle" &&
            (p.underlyingTokens ?? []).some((t) => t.toLowerCase() === needle),
        )
        .map((p) => ({ project: p.project, symbol: p.symbol, tvlUsd: p.tvlUsd, pool: p.pool }));
      return sourced(matches, {
        sourceName: "DefiLlama (yields/pools)",
        url: "https://yields.llama.fi/pools",
        observedAt,
        kind: "fact",
        note: `filtered chain=Mantle, underlyingTokens contains ${tokenAddress}`,
      });
    },
  };
}
