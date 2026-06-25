import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { type SecondaryVenue } from "../engine/types.js";
import { hasCode } from "../lib/onchain.js";
import { MANTLE_DEX_FACTORIES, QUOTE_TOKENS } from "./factories.js";
import type { DefiLlamaAdapter } from "../adapters/defillama.js";

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
  venues: SecondaryVenue[];
  /** True when no live secondary venue was found anywhere — a thesis-proving headline. */
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

  // DefiLlama cross-check
  const llamaPools = await llama.poolsForToken(token, observedAt);
  for (const p of llamaPools.value) {
    venues.push({
      venue: `${p.project} ${p.symbol}`,
      kind: "dex-pool",
      receipt: { ...llamaPools.receipt, note: `DefiLlama pool ${p.pool} (TVL $${p.tvlUsd})` },
    });
  }

  return { venues, noSecondaryMarket: venues.length === 0 };
}
