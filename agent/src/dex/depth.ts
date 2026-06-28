import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { MANTLE_DEX_FACTORIES, QUOTE_TOKENS } from "./factories.js";
import { cpmmSlippagePct, STANDARD_CLEAR_SIZE_USD } from "./slippage.js";
import { hasCode } from "../lib/onchain.js";
import { type DefiLlamaAdapter, classifyLlamaPool } from "../adapters/defillama.js";
import { type GtPoolsResult } from "../adapters/geckoterminal.js";
import type { PriceAdapter } from "../adapters/prices.js";
import type { SourceReceipt } from "../types/source-receipt.js";

/**
 * Per-venue liquidity for the depth + fragmentation sub-scores. Two methods, clearly labelled:
 *  - "cpmm-exact": a Uniswap-v2-style pair — we read on-chain reserves and compute the USD tradeable
 *     within ±2% of mid exactly (constant-product).
 *  - "tvl-proxy": a venue only visible via DefiLlama (v3 / Liquidity Book) — we use pool TVL as the
 *     liquidity magnitude and do NOT claim a precise ±2% depth.
 */
export interface VenueLiquidity {
  venue: string;
  liquidityUsd: number;
  depthUsdAt2pct: number | null;
  /** Constant-product price impact (%) to clear a $250k order; null for TVL-proxy venues. */
  slipPctAt250k: number | null;
  /** cpmm-exact = on-chain reserves (fact); gt-estimate = GeckoTerminal reserve → CPMM approximation
   * (estimate); tvl-proxy = DefiLlama TVL magnitude only. */
  method: "cpmm-exact" | "gt-estimate" | "tvl-proxy";
  /** swap = genuine trading venue (counts toward depth); yield = single-asset position (does not). */
  venueType: "swap" | "yield";
  classification?: string;
  /** Friendly DEX name (e.g. "Agni") when known. */
  dex?: string | undefined;
  /** 24h trade volume in USD when known. */
  volume24hUsd?: number | undefined;
  receipt: SourceReceipt;
}

export interface LiquidityResult {
  /** All venues (swap + yield), for drill-down. */
  venues: VenueLiquidity[];
  /** Genuine trading venues — the only ones counted in the totals below. */
  swapVenues: VenueLiquidity[];
  /** Single-asset yield/vault positions — surfaced but excluded from tradeable depth. */
  yieldVenues: VenueLiquidity[];
  /** Totals over SWAP venues only (vault TVL is not tradeable secondary liquidity). */
  totalLiquidityUsd: number;
  totalDepthUsdAt2pct: number;
}

const FACTORY_ABI = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { type: "address" },
      { type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

const PAIR_ABI = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "r0", type: "uint112" },
      { name: "r1", type: "uint112" },
      { name: "ts", type: "uint32" },
    ],
  },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

/** USD tradeable to move a constant-product pool price by +2%, as a fraction of the quote reserve. */
const TWO_PCT_FRACTION = Math.sqrt(1.02) - 1; // ≈ 0.00995

export async function analyzeLiquidity(
  client: PublicClient,
  network: MantleNetwork,
  asset: Address,
  llama: DefiLlamaAdapter,
  gtPools: GtPoolsResult,
  prices: PriceAdapter,
  observedAt: string,
): Promise<LiquidityResult> {
  const explorer = explorerBaseFor(network);
  const venues: VenueLiquidity[] = [];
  const seenPools = new Set<string>(); // dedupe GeckoTerminal vs on-chain by pool address

  // 1) Uniswap-v2-style pairs — exact reserves + ±2% depth. Best-effort (GeckoTerminal is primary);
  //    a transient RPC failure here must not sink the map.
  for (const factory of MANTLE_DEX_FACTORIES) {
    if (factory.kind !== "v2") continue;
    try {
      if (!(await hasCode(client, factory.address))) continue;
    } catch {
      continue;
    }
    for (const quote of QUOTE_TOKENS) {
      let pair: Address;
      try {
        pair = (await client.readContract({
          address: factory.address,
          abi: FACTORY_ABI,
          functionName: "getPair",
          args: [asset, quote.address],
        })) as Address;
      } catch {
        continue;
      }
      if (!pair || getAddress(pair) === zeroAddress) continue;

      let reserves: readonly [bigint, bigint, number];
      let token0: Address;
      try {
        [reserves, token0] = (await Promise.all([
          client.readContract({ address: pair, abi: PAIR_ABI, functionName: "getReserves" }),
          client.readContract({ address: pair, abi: PAIR_ABI, functionName: "token0" }),
        ])) as [readonly [bigint, bigint, number], Address];
      } catch {
        continue;
      }
      const assetIsToken0 = getAddress(token0) === getAddress(asset);
      const quoteReserveRaw = assetIsToken0 ? reserves[1] : reserves[0];

      const qp = await prices.getPrice(quote.address, observedAt);
      const quotePrice = qp.value?.priceUsd;
      if (quotePrice == null) continue;

      const quoteReserveUsd = (Number(quoteReserveRaw) / 10 ** quote.decimals) * quotePrice;
      if (quoteReserveUsd <= 0) continue;

      seenPools.add(pair.toLowerCase());
      venues.push({
        venue: `${factory.name} ·/${quote.symbol}`,
        liquidityUsd: quoteReserveUsd * 2, // balanced pool ≈ 2× one side
        depthUsdAt2pct: quoteReserveUsd * TWO_PCT_FRACTION,
        // Selling the asset moves price against the asset reserve (≈ quote reserve in USD for a
        // balanced pool) — exact CPMM impact for a $250k exit.
        slipPctAt250k: cpmmSlippagePct(quoteReserveUsd, STANDARD_CLEAR_SIZE_USD),
        method: "cpmm-exact",
        venueType: "swap", // an on-chain CPMM pair is a genuine trading venue
        dex: factory.name,
        receipt: {
          sourceName: "Mantle RPC (getReserves)",
          url: `${explorer}/address/${pair}`,
          observedAt,
          kind: "fact",
          note: `${factory.name} reserves; quote ${quote.symbol} @ $${quotePrice} (DefiLlama); $250k slip via constant-product`,
        },
      });
    }
  }

  // 2) GeckoTerminal DEX pools — the comprehensive Mantle DEX index (Agni, Merchant Moe LB, FusionX,
  //    …). reserve_in_usd is total two-sided liquidity → one side ≈ reserve/2; the ±2% depth and
  //    $250k slippage are a CPMM APPROXIMATION (labelled gt-estimate / kind:"estimate", never a fact).
  // Shared GeckoTerminal pools (fetched once upstream). When ok=false the index was unreachable —
  // depth falls back to on-chain venues; reachability flags it insufficient-data.
  for (const p of gtPools.pools) {
    if (seenPools.has(p.poolAddress.toLowerCase())) continue; // on-chain exact already counted
    seenPools.add(p.poolAddress.toLowerCase());
    const sideUsd = p.liquidityUsd / 2;
    venues.push({
      venue: `${p.dexLabel} · ${p.venue}`,
      liquidityUsd: p.liquidityUsd,
      depthUsdAt2pct: sideUsd * TWO_PCT_FRACTION,
      slipPctAt250k: cpmmSlippagePct(sideUsd, STANDARD_CLEAR_SIZE_USD),
      method: "gt-estimate",
      venueType: "swap",
      dex: p.dexLabel,
      volume24hUsd: p.volume24hUsd,
      receipt: {
        ...gtPools.receipt,
        kind: "estimate",
        url: `${explorer}/address/${p.poolAddress}`,
        note: `${p.dexLabel} ${p.venue}: GeckoTerminal reserve $${Math.round(p.liquidityUsd)}, 24h vol $${Math.round(p.volume24hUsd)}; ±2% depth & $250k slip = CPMM approximation (reserve/2 per side)`,
      },
    });
  }

  // 3) DefiLlama — YIELD/vault positions only (single-asset TVL; not tradeable secondary liquidity).
  const pools = await llama.poolsForToken(asset, observedAt);
  for (const p of pools.value) {
    const c = classifyLlamaPool(p);
    if (c.type !== "yield") continue;
    venues.push({
      venue: `${p.project} ${p.symbol}`,
      liquidityUsd: p.tvlUsd,
      depthUsdAt2pct: null,
      slipPctAt250k: null,
      method: "tvl-proxy",
      venueType: "yield",
      classification: c.reason,
      receipt: { ...pools.receipt, note: `DefiLlama pool ${p.pool} · TVL $${Math.round(p.tvlUsd)} — ${c.reason}` },
    });
  }

  const swapVenues = venues.filter((v) => v.venueType === "swap");
  const yieldVenues = venues.filter((v) => v.venueType === "yield");
  return {
    venues,
    swapVenues,
    yieldVenues,
    // Totals over SWAP venues only — vault TVL isn't tradeable exit liquidity.
    totalLiquidityUsd: swapVenues.reduce((s, v) => s + v.liquidityUsd, 0),
    totalDepthUsdAt2pct: swapVenues.reduce((s, v) => s + (v.depthUsdAt2pct ?? 0), 0),
  };
}
