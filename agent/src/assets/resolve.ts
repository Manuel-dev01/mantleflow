import { type Address, type PublicClient, getAddress, isAddress } from "viem";
import { type MantleNetwork } from "../config/chains.js";
import { TRACKED_ASSETS, type TrackedAsset } from "../config/addresses.js";
import { hasCode } from "../lib/onchain.js";
import { readTokenFacts } from "../adapters/erc20.js";
import { type GeckoTerminalAdapter } from "../adapters/geckoterminal.js";

/**
 * Resolve a user input (a tracked symbol/name, an arbitrary contract address, or an uncurated
 * symbol/name to search) into a `ResolvedAsset`. This is the single entry point that lets MantleFlow
 * analyze ANY Mantle token, not just the curated six — the engine capabilities are already
 * address-driven. Curated assets carry hand-verified metadata (issuer, isProxy); arbitrary ones are
 * built from on-chain ERC-20 reads and marked `curated:false`.
 */
export interface ResolvedAsset {
  symbol: string;
  name: string;
  network: MantleNetwork;
  address: Address;
  decimals: number;
  issuer?: string | undefined;
  isProxy?: boolean | undefined;
  curated: boolean;
}

export interface ResolveDeps {
  client: PublicClient;
  gt: GeckoTerminalAdapter;
}

function fromCurated(a: TrackedAsset): ResolvedAsset {
  return {
    symbol: a.symbol,
    name: a.name,
    network: a.network as MantleNetwork,
    address: a.address as Address,
    decimals: a.decimals,
    curated: true,
    ...(a.issuer ? { issuer: a.issuer } : {}),
    ...(a.isProxy != null ? { isProxy: a.isProxy } : {}),
  };
}

function curatedByAddress(address: string, network: MantleNetwork): TrackedAsset | undefined {
  const lc = address.toLowerCase();
  return Object.values(TRACKED_ASSETS).find((a) => a.address.toLowerCase() === lc && a.network === network);
}

/** Exact then substring match against the curated set (preserves natural-language mentions like
 * "map mETH distribution" → mETH). */
function curatedBySymbolOrName(q: string): TrackedAsset | undefined {
  const lc = q.trim().toLowerCase();
  const all = Object.values(TRACKED_ASSETS);
  return (
    all.find((a) => a.symbol.toLowerCase() === lc || a.name.toLowerCase() === lc) ??
    all.find((a) => lc.includes(a.symbol.toLowerCase()) || lc.includes(a.name.toLowerCase()))
  );
}

async function fromAddress(
  address: Address,
  network: MantleNetwork,
  deps: ResolveDeps,
  observedAt: string,
): Promise<ResolvedAsset | null> {
  const cur = curatedByAddress(address, network);
  if (cur) return fromCurated(cur); // known asset — return rich curated metadata
  try {
    if (!(await hasCode(deps.client, address))) return null; // not a contract on this network
    const facts = await readTokenFacts(deps.client, network, address, observedAt);
    const symbol = (facts.value.symbol || "").trim() || address.slice(0, 6);
    return {
      symbol,
      name: (facts.value.name || "").trim() || symbol,
      network,
      address,
      decimals: facts.value.decimals,
      curated: false,
    };
  } catch {
    return null; // not an ERC-20 we can read
  }
}

export async function resolveToAsset(
  input: string,
  network: MantleNetwork,
  deps: ResolveDeps,
  observedAt: string,
): Promise<ResolvedAsset | null> {
  const q = input.trim();
  if (!q) return null;

  if (isAddress(q)) return fromAddress(getAddress(q), network, deps, observedAt);

  const cur = curatedBySymbolOrName(q);
  if (cur) return fromCurated(cur);

  // Uncurated symbol/name → resolve an address via the GeckoTerminal search index (mainnet only).
  const hits = await deps.gt.searchToken(network, q);
  for (const h of hits) {
    if (isAddress(h.address)) {
      const r = await fromAddress(getAddress(h.address), network, deps, observedAt);
      if (r) return r;
    }
  }
  return null;
}
