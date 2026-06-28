import { fetchJson } from "../lib/http.js";
import { type MantleNetwork } from "../config/chains.js";
import { type Sourced, type SourceReceipt, sourced } from "../types/source-receipt.js";

/**
 * GeckoTerminal adapter (keyless). The comprehensive source of real DEX liquidity on Mantle — it
 * indexes every Mantle DEX (Agni, Merchant Moe classic + Liquidity Book, FusionX, Cleopatra, iZiSwap,
 * Butter, Oku, Swapsicle, Fluxion, …), which our single on-chain Merchant-Moe-v2 probe misses. Used as
 * the PRIMARY secondary-trading-venue + liquidity source, plus token market facts (price / mcap / FDV
 * / 24h volume). Free tier ≈ 30 req/min → we cache 5 min and keep the 6-asset compare sequential.
 */
const GT_BASE = "https://api.geckoterminal.com/api/v2";
const GT_NETWORK = "mantle"; // GeckoTerminal network slug for Mantle mainnet (5000)

/** Friendly labels for the Mantle DEX ids GeckoTerminal returns (fallback: titlecased id). */
const GT_DEX_LABELS: Record<string, string> = {
  "agni-finance": "Agni",
  "merchant-moe-liquidity-book-mantle": "Merchant Moe (LB)",
  "merchant-moe-mantle": "Merchant Moe",
  "merchant-moe": "Merchant Moe",
  "fusionx-v3": "FusionX",
  fusionx: "FusionX",
  "cleopatra-exchange": "Cleopatra",
  "iziswap-mantle": "iZiSwap",
  "oku-trade-mantle": "Oku",
  "swapsicle-v2-mantle": "Swapsicle",
  fluxion: "Fluxion",
  "butter-xyz": "Butter",
};

function dexLabel(id: string): string {
  return GT_DEX_LABELS[id] ?? id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Coerce GeckoTerminal's string numerics to a finite number, or null. */
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export interface GtPool {
  /** Pool display name, e.g. "mETH / USDT0". */
  venue: string;
  dexId: string;
  dexLabel: string;
  /** Total (two-sided) USD liquidity in the pool. */
  liquidityUsd: number;
  /** 24h trade volume in USD (0 when unknown). */
  volume24hUsd: number;
  poolAddress: string;
  baseSymbol?: string | undefined;
  quoteSymbol?: string | undefined;
}

export interface GtTokenMarket {
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
}

/** A single fetch of a token's pools, shared by reachability + depth so they never disagree.
 * `ok=false` ⇒ the DEX index was unreachable (don't read the empty `pools` as "no venue"). */
export interface GtPoolsResult {
  pools: GtPool[];
  receipt: SourceReceipt;
  ok: boolean;
}

interface GtPoolRaw {
  attributes?: { name?: string; address?: string; reserve_in_usd?: string; volume_usd?: { h24?: string } };
  relationships?: { dex?: { data?: { id?: string } } };
}
interface GtTokenRaw {
  data?: { attributes?: { price_usd?: string; market_cap_usd?: string; fdv_usd?: string; volume_usd?: { h24?: string } } };
}

export interface GeckoTerminalAdapter {
  /** Real DEX pools containing `address` on Mantle, sorted by USD liquidity desc. THROWS on a failed
   * call (rate-limit/outage) so callers never read the failure as "0 venues". */
  poolsForToken(network: MantleNetwork, address: string, observedAt: string): Promise<Sourced<GtPool[]>>;
  /** Same fetch, but never throws — returns `{pools, receipt, ok}`. Fetch ONCE per asset and share
   * between reachability + depth so they always agree on availability. */
  poolsResult(network: MantleNetwork, address: string, observedAt: string): Promise<GtPoolsResult>;
  /** Token market facts (price / mcap / fdv / 24h volume). */
  tokenMarket(network: MantleNetwork, address: string, observedAt: string): Promise<Sourced<GtTokenMarket>>;
}

export function createGeckoTerminalAdapter(): GeckoTerminalAdapter {
  return {
    async poolsForToken(network, address, observedAt) {
      const url = `${GT_BASE}/networks/${GT_NETWORK}/tokens/${address.toLowerCase()}/pools?page=1`;
      const receipt = {
        sourceName: "GeckoTerminal (DEX pools)",
        url: `https://www.geckoterminal.com/mantle/tokens/${address.toLowerCase()}`,
        observedAt,
        kind: "fact" as const,
        note: `pools for ${address} on ${GT_NETWORK}`,
      };
      // GeckoTerminal only indexes Mantle mainnet; nothing to query for testnet assets.
      if (network !== "mainnet") return sourced([], { ...receipt, note: "GeckoTerminal indexes mainnet only" });
      // GeckoTerminal is the AUTHORITATIVE venue source — a rate-limited/failed call must NOT be read
      // as "0 venues" (that would be a false "no trading venue" finding). Retry hard, then THROW so
      // the caller reports insufficient-data rather than a false absence. (tokenMarket stays graceful.)
      {
        const data = await fetchJson<{ data?: GtPoolRaw[] }>(url, { ttlMs: 5 * 60_000, timeoutMs: 20_000, retries: 5 });
        const pools = (data.data ?? [])
          .map((p): GtPool | null => {
            const a = p.attributes ?? {};
            const addr = a.address;
            if (!addr) return null;
            const name = a.name ?? "";
            const [base, quote] = name.split(" / ");
            const dexId = p.relationships?.dex?.data?.id ?? "unknown";
            return {
              venue: name,
              dexId,
              dexLabel: dexLabel(dexId),
              liquidityUsd: num(a.reserve_in_usd) ?? 0,
              volume24hUsd: num(a.volume_usd?.h24) ?? 0,
              poolAddress: addr,
              baseSymbol: base?.trim() || undefined,
              quoteSymbol: quote?.trim() || undefined,
            };
          })
          .filter((p): p is GtPool => p !== null)
          .sort((x, y) => y.liquidityUsd - x.liquidityUsd);
        return sourced(pools, receipt);
      }
    },

    async poolsResult(network, address, observedAt) {
      const receipt = {
        sourceName: "GeckoTerminal (DEX pools)",
        url: `https://www.geckoterminal.com/mantle/tokens/${address.toLowerCase()}`,
        observedAt,
        kind: "fact" as const,
        note: `pools for ${address} on ${GT_NETWORK}`,
      };
      try {
        const r = await this.poolsForToken(network, address, observedAt);
        return { pools: r.value, receipt: r.receipt, ok: true };
      } catch {
        return { pools: [], receipt: { ...receipt, note: "DEX index unreachable this run" }, ok: false };
      }
    },

    async tokenMarket(network, address, observedAt) {
      const url = `${GT_BASE}/networks/${GT_NETWORK}/tokens/${address.toLowerCase()}`;
      const receipt = {
        sourceName: "GeckoTerminal (token)",
        url: `https://www.geckoterminal.com/mantle/tokens/${address.toLowerCase()}`,
        observedAt,
        kind: "fact" as const,
        note: `market facts for ${address}`,
      };
      const empty: GtTokenMarket = { priceUsd: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null };
      if (network !== "mainnet") return sourced(empty, { ...receipt, note: "GeckoTerminal indexes mainnet only" });
      try {
        const data = await fetchJson<GtTokenRaw>(url, { ttlMs: 5 * 60_000, timeoutMs: 20_000 });
        const a = data.data?.attributes ?? {};
        return sourced(
          {
            priceUsd: num(a.price_usd),
            marketCapUsd: num(a.market_cap_usd),
            fdvUsd: num(a.fdv_usd),
            volume24hUsd: num(a.volume_usd?.h24),
          },
          receipt,
        );
      } catch {
        return sourced(empty, receipt);
      }
    },
  };
}
