import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { MANTLE_DEX_FACTORIES, QUOTE_TOKENS } from "./factories.js";
import { hasCode } from "../lib/onchain.js";
import type { DefiLlamaAdapter } from "../adapters/defillama.js";
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
  method: "cpmm-exact" | "tvl-proxy";
  receipt: SourceReceipt;
}

export interface LiquidityResult {
  venues: VenueLiquidity[];
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
  prices: PriceAdapter,
  observedAt: string,
): Promise<LiquidityResult> {
  const explorer = explorerBaseFor(network);
  const venues: VenueLiquidity[] = [];

  // 1) Uniswap-v2-style pairs — exact reserves + ±2% depth.
  for (const factory of MANTLE_DEX_FACTORIES) {
    if (factory.kind !== "v2") continue;
    if (!(await hasCode(client, factory.address))) continue;
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

      venues.push({
        venue: `${factory.name} ·/${quote.symbol}`,
        liquidityUsd: quoteReserveUsd * 2, // balanced pool ≈ 2× one side
        depthUsdAt2pct: quoteReserveUsd * TWO_PCT_FRACTION,
        method: "cpmm-exact",
        receipt: {
          sourceName: "Mantle RPC (getReserves)",
          url: `${explorer}/address/${pair}`,
          observedAt,
          kind: "fact",
          note: `${factory.name} reserves; quote ${quote.symbol} @ $${quotePrice} (DefiLlama)`,
        },
      });
    }
  }

  // 2) DefiLlama pools — TVL as the liquidity proxy for v3 / Liquidity Book venues.
  const pools = await llama.poolsForToken(asset, observedAt);
  for (const p of pools.value) {
    venues.push({
      venue: `${p.project} ${p.symbol}`,
      liquidityUsd: p.tvlUsd,
      depthUsdAt2pct: null,
      method: "tvl-proxy",
      receipt: { ...pools.receipt, note: `DefiLlama pool ${p.pool} · TVL $${Math.round(p.tvlUsd)}` },
    });
  }

  return {
    venues,
    totalLiquidityUsd: venues.reduce((s, v) => s + v.liquidityUsd, 0),
    totalDepthUsdAt2pct: venues.reduce((s, v) => s + (v.depthUsdAt2pct ?? 0), 0),
  };
}
