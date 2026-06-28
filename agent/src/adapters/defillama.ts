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
  /** "multi" = a 2+-sided AMM pool (tradeable); "single" = single-asset deposit (yield/lending). */
  exposure?: string | null;
  poolMeta?: string | null;
}

export interface LlamaPoolMatch {
  project: string;
  symbol: string;
  tvlUsd: number;
  pool: string;
  exposure?: string | null;
  poolMeta?: string | null;
}

export interface DefiLlamaAdapter {
  /** Pools on Mantle whose underlying tokens include `tokenAddress` (case-insensitive). */
  poolsForToken(
    tokenAddress: string,
    observedAt: string,
  ): Promise<Sourced<LlamaPoolMatch[]>>;
}

export type VenueType = "swap" | "yield";

/**
 * Known DEX/AMM project slugs on Mantle (DefiLlama `project`). Used ONLY as a fallback when the
 * `exposure` field is missing — the primary signal is `exposure` ("multi" ⇒ a real 2-sided trading
 * pool; "single" ⇒ a single-asset yield/lending/vault deposit, not somewhere you can sell into).
 * Verified against live DefiLlama Mantle data 2026-06-27 (the only `multi` project there is
 * fluxion-network; aave-v3 / woofi-earn / circuit-protocol / ondo-yield-assets / clearpool-lending
 * are all `single` = yield).
 */
export const DEX_PROJECTS = new Set<string>([
  "fluxion-network",
  "merchant-moe",
  "agni",
  "agni-finance",
  "fusionx",
  "fusionx-v3",
  "butter",
  "woofi", // WOOFi *Swap* (a DEX) — distinct from "woofi-earn" (a yield vault)
  "uniswap-v3",
  "swapsicle",
  "izumi-finance",
  "iziswap",
]);

/**
 * Classify a DefiLlama pool as a genuine swap/trading venue vs a yield/lending/vault position.
 * Primary signal: `exposure` ("multi" ⇒ swap, "single" ⇒ yield). When absent, fall back to the
 * DEX-project allowlist; default to "yield" (conservative — we never claim a tradeable venue we
 * cannot corroborate). Returns the reason so the UI/receipt can show WHY it was (not) counted.
 */
export function classifyLlamaPool(p: Pick<LlamaPoolMatch, "project" | "exposure">): {
  type: VenueType;
  reason: string;
} {
  const proj = (p.project ?? "").toLowerCase();
  const exp = (p.exposure ?? "").toLowerCase();
  if (exp === "multi") return { type: "swap", reason: `2-sided AMM pool on '${p.project}' (exposure=multi) — tradeable` };
  if (exp === "single") return { type: "yield", reason: `single-asset position on '${p.project}' (exposure=single) — yield/lending, not a trading venue` };
  // exposure missing → fall back to the DEX allowlist.
  if (DEX_PROJECTS.has(proj)) return { type: "swap", reason: `'${p.project}' is a known DEX (exposure unknown)` };
  return { type: "yield", reason: `'${p.project}' not a recognized trading venue (exposure unknown)` };
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
        .map((p) => ({ project: p.project, symbol: p.symbol, tvlUsd: p.tvlUsd, pool: p.pool, exposure: p.exposure ?? null, poolMeta: p.poolMeta ?? null }));
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
