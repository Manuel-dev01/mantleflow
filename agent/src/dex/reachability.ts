import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { type SecondaryVenue } from "../engine/types.js";
import { hasCode } from "../lib/onchain.js";
import { MANTLE_DEX_FACTORIES, QUOTE_TOKENS } from "./factories.js";
import { type DefiLlamaAdapter, classifyLlamaPool } from "../adapters/defillama.js";
import { type GtPoolsResult } from "../adapters/geckoterminal.js";

const V2_FACTORY_ABI = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "a", type: "address" },
      { name: "b", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const;

export interface ReachabilityResult {
  /** All venues found (swap + yield), for drill-down. */
  venues: SecondaryVenue[];
  /** Genuine trading venues — the only ones that count toward reachability. */
  swapVenues: SecondaryVenue[];
  /** Single-asset yield/lending/vault positions — surfaced but NOT counted as exit routes. */
  yieldVenues: SecondaryVenue[];
  /** True when no genuine secondary TRADING venue was found AND the DEX index was reachable. */
  noSecondaryMarket: boolean;
  /** Whether the GeckoTerminal DEX index responded — false ⇒ we couldn't fully check (don't claim
   * "no venue"; the engine reports insufficient-data instead of a false absence). */
  gtSourced: boolean;
}

/**
 * Find live secondary venues for `token` on Mantle by (a) querying V2-style DEX factories for a
 * pair against common quote tokens, and (b) cross-checking DefiLlama pools. Both empty ⇒ "no
 * on-chain secondary venue". Real reads only; factory `getCode` is confirmed before trusting.
 */
export async function findSecondaryVenues(
  client: PublicClient,
  network: MantleNetwork,
  token: Address,
  llama: DefiLlamaAdapter,
  gtPools: GtPoolsResult,
  observedAt: string,
): Promise<ReachabilityResult> {
  const venues: SecondaryVenue[] = [];
  const explorer = explorerBaseFor(network);
  const seenPools = new Set<string>(); // dedupe GeckoTerminal vs on-chain by pool address

  for (const factory of MANTLE_DEX_FACTORIES) {
    if (factory.kind !== "v2") continue; // classic-v2 only; LB/Agni/etc. come from GeckoTerminal below
    // On-chain probe is a best-effort corroboration of exact reserves — GeckoTerminal is the primary
    // venue source, so a transient RPC failure here must NOT sink the map.
    try {
      if (!(await hasCode(client, factory.address))) continue; // address-trust: confirm on-chain
    } catch {
      continue;
    }
    for (const quote of QUOTE_TOKENS) {
      let pair: Address;
      try {
        pair = (await client.readContract({
          address: factory.address,
          abi: V2_FACTORY_ABI,
          functionName: "getPair",
          args: [token, quote.address],
        })) as Address;
      } catch {
        continue;
      }
      if (pair && getAddress(pair) !== zeroAddress) {
        seenPools.add(pair.toLowerCase());
        venues.push({
          venue: `${factory.name} ${"<token>"}/${quote.symbol}`,
          kind: "dex-pair",
          venueType: "swap", // an on-chain v2 pair is a genuine trading venue
          classification: `on-chain ${factory.name} pair (token/${quote.symbol})`,
          dex: factory.name,
          pairAddress: pair,
          receipt: {
            sourceName: "Mantle RPC (eth_call)",
            url: `${explorer}/address/${pair}`,
            observedAt,
            kind: "fact",
            note: `${factory.name} getPair(token, ${quote.symbol}) on ${factory.address}`,
          },
        });
      }
    }
  }

  // GeckoTerminal — the comprehensive DEX index across all Mantle DEXs (the primary swap-venue source;
  // our on-chain probe only covers Merchant Moe v2). Every GT pool is a genuine trading venue. The
  // pools were fetched ONCE upstream and shared with depth; `ok=false` (rate-limit/outage) must NOT be
  // read as "0 venues".
  const gtSourced = gtPools.ok;
  for (const p of gtPools.pools) {
    if (seenPools.has(p.poolAddress.toLowerCase())) continue; // already found on-chain (exact)
    seenPools.add(p.poolAddress.toLowerCase());
    venues.push({
      venue: `${p.dexLabel} · ${p.venue}`,
      kind: "dex-pool",
      venueType: "swap",
      classification: `DEX pool on ${p.dexLabel} (GeckoTerminal)`,
      dex: p.dexLabel,
      volume24hUsd: p.volume24hUsd,
      pairAddress: p.poolAddress,
      receipt: { ...gtPools.receipt, note: `${p.dexLabel} ${p.venue} — liq $${Math.round(p.liquidityUsd)}, 24h vol $${Math.round(p.volume24hUsd)}` },
    });
  }

  // DefiLlama — keep only YIELD/vault positions (single-asset deposits). GeckoTerminal supersedes
  // DefiLlama's swap pools (avoids double-counting); yield positions are surfaced, not counted.
  const llamaPools = await llama.poolsForToken(token, observedAt);
  for (const p of llamaPools.value) {
    const c = classifyLlamaPool(p);
    if (c.type !== "yield") continue;
    venues.push({
      venue: `${p.project} ${p.symbol}`,
      kind: "dex-pool",
      venueType: "yield",
      classification: c.reason,
      receipt: { ...llamaPools.receipt, note: `DefiLlama pool ${p.pool} (TVL $${Math.round(p.tvlUsd)}) — ${c.reason}` },
    });
  }

  const swapVenues = venues.filter((v) => v.venueType === "swap");
  const yieldVenues = venues.filter((v) => v.venueType === "yield");
  // "No secondary market" means no genuine TRADING venue AND we actually reached the DEX index. If GT
  // was unreachable and on-chain found nothing, we can't claim absence — the engine reports
  // insufficient-data instead (never a false "no venue").
  return { venues, swapVenues, yieldVenues, noSecondaryMarket: swapVenues.length === 0 && gtSourced, gtSourced };
}
