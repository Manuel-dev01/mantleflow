import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { type SecondaryVenue } from "../engine/types.js";
import { hasCode } from "../lib/onchain.js";
import { MANTLE_DEX_FACTORIES, QUOTE_TOKENS } from "./factories.js";
import { type DefiLlamaAdapter, classifyLlamaPool } from "../adapters/defillama.js";

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
  /** True when no genuine secondary TRADING venue was found via probed venues — a thesis headline. */
  noSecondaryMarket: boolean;
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
  observedAt: string,
): Promise<ReachabilityResult> {
  const venues: SecondaryVenue[] = [];
  const explorer = explorerBaseFor(network);

  for (const factory of MANTLE_DEX_FACTORIES) {
    if (factory.kind !== "v2") continue; // LB + Agni handled in Phase 2
    if (!(await hasCode(client, factory.address))) continue; // address-trust: confirm on-chain
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
        venues.push({
          venue: `${factory.name} ${"<token>"}/${quote.symbol}`,
          kind: "dex-pair",
          venueType: "swap", // an on-chain v2 pair is a genuine trading venue
          classification: `on-chain ${factory.name} pair (token/${quote.symbol})`,
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

  // DefiLlama cross-check — classify each pool as a genuine swap venue vs a yield/vault position.
  const llamaPools = await llama.poolsForToken(token, observedAt);
  for (const p of llamaPools.value) {
    const c = classifyLlamaPool(p);
    venues.push({
      venue: `${p.project} ${p.symbol}`,
      kind: "dex-pool",
      venueType: c.type,
      classification: c.reason,
      receipt: { ...llamaPools.receipt, note: `DefiLlama pool ${p.pool} (TVL $${Math.round(p.tvlUsd)}) — ${c.reason}` },
    });
  }

  const swapVenues = venues.filter((v) => v.venueType === "swap");
  const yieldVenues = venues.filter((v) => v.venueType === "yield");
  // "No secondary market" now means no genuine TRADING venue (yield/vault positions don't count as
  // exit liquidity). Scoped to the venues we probe — see the sub-score explanation.
  return { venues, swapVenues, yieldVenues, noSecondaryMarket: swapVenues.length === 0 };
}
