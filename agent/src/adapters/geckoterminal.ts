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
  /** On-GeckoTerminal token metadata (context), when listed. */
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  imageUrl: string | null;
  /** CoinGecko coin id when GeckoTerminal has one — a "this token is listed / known" signal. */
  coingeckoId: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
}

/** A token candidate from a symbol/name search (address + symbol on Mantle). */
export interface GtTokenHit {
  address: string;
  symbol: string;
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
  data?: {
    attributes?: {
      name?: string;
      symbol?: string;
      decimals?: number;
      image_url?: string | null;
      coingecko_coin_id?: string | null;
      price_usd?: string;
      market_cap_usd?: string;
      fdv_usd?: string;
      volume_usd?: { h24?: string };
    };
  };
}

interface GtSearchPool {
  id?: string;
  attributes?: { name?: string };
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
  };
}

export interface GeckoTerminalAdapter {
  /** Real DEX pools containing `address` on Mantle, sorted by USD liquidity desc. THROWS on a failed
   * call (rate-limit/outage) so callers never read the failure as "0 venues". */
  poolsForToken(network: MantleNetwork, address: string, observedAt: string): Promise<Sourced<GtPool[]>>;
  /** Same fetch, but never throws — returns `{pools, receipt, ok}`. Fetch ONCE per asset and share
   * between reachability + depth so they always agree on availability. */
  poolsResult(network: MantleNetwork, address: string, observedAt: string): Promise<GtPoolsResult>;
  /** Token market facts + on-GeckoTerminal metadata (name/symbol/decimals/image/coingecko id). */
  tokenMarket(network: MantleNetwork, address: string, observedAt: string): Promise<Sourced<GtTokenMarket>>;
  /** Symbol/name → candidate Mantle token addresses, via GeckoTerminal's pool search. Never throws
   * (a search miss returns []); mainnet only. Used to resolve an uncurated symbol to an address. */
  searchToken(network: MantleNetwork, query: string): Promise<GtTokenHit[]>;
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
      const empty: GtTokenMarket = {
        name: null, symbol: null, decimals: null, imageUrl: null, coingeckoId: null,
        priceUsd: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null,
      };
      if (network !== "mainnet") return sourced(empty, { ...receipt, note: "GeckoTerminal indexes mainnet only" });
      try {
        const data = await fetchJson<GtTokenRaw>(url, { ttlMs: 5 * 60_000, timeoutMs: 20_000 });
        const a = data.data?.attributes ?? {};
        return sourced(
          {
            name: a.name ?? null,
            symbol: a.symbol ?? null,
            decimals: typeof a.decimals === "number" ? a.decimals : null,
            imageUrl: a.image_url && a.image_url !== "missing.png" ? a.image_url : null,
            coingeckoId: a.coingecko_coin_id ?? null,
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

    async searchToken(network, query) {
      const q = query.trim();
      if (network !== "mainnet" || q.length < 2) return [];
      const url = `${GT_BASE}/search/pools?query=${encodeURIComponent(q)}&network=${GT_NETWORK}&page=1`;
      const idAddr = (id?: string): string | null =>
        id && id.startsWith(`${GT_NETWORK}_`) ? id.slice(GT_NETWORK.length + 1) : null;
      try {
        const data = await fetchJson<{ data?: GtSearchPool[] }>(url, { ttlMs: 5 * 60_000, timeoutMs: 15_000, retries: 2 });
        const hits = new Map<string, GtTokenHit>(); // dedupe by address
        for (const p of data.data ?? []) {
          if (!p.id?.startsWith(`${GT_NETWORK}_`)) continue; // Mantle pools only
          const [base, quote] = (p.attributes?.name ?? "").split(" / ").map((s) => s.trim());
          for (const c of [
            { sym: base, addr: idAddr(p.relationships?.base_token?.data?.id) },
            { sym: quote, addr: idAddr(p.relationships?.quote_token?.data?.id) },
          ]) {
            if (!c.addr || !c.sym) continue;
            const key = c.addr.toLowerCase();
            if (!hits.has(key)) hits.set(key, { address: c.addr, symbol: c.sym });
          }
        }
        const lc = q.toLowerCase();
        const all = [...hits.values()];
        const matched = all.filter((t) => t.symbol.toLowerCase().includes(lc) || lc.includes(t.symbol.toLowerCase()));
        return (matched.length ? matched : all).slice(0, 6);
      } catch {
        return [];
      }
    },
  };
}
