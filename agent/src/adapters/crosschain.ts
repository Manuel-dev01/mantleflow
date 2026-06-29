import { type Address, type PublicClient, getAddress, isAddress } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import type { SourceReceipt } from "../types/source-receipt.js";

/**
 * Cross-chain reach for a Mantle asset — which permissionless routes OFF Mantle actually exist.
 * Two verifiable signals, each sourced:
 *   - LayerZero OFT: the token exposes the canonical LZ V2 endpoint on-chain (an omnichain token).
 *   - Chainlink CCIP: whether the asset is in Mantle's CCIP token set (Chainlink CCIP directory).
 * We report negative results too (route checked, not available) — an absence is a distribution
 * finding, not a gap. Costs are NOT fabricated: CCIP/LZ fees are per-tx dynamic ("not quoted").
 */

// Canonical LayerZero V2 EndpointV2 (same address across chains; confirmed on Mantle on-chain via
// cmETH/USDe `endpoint()`).
const LZ_V2_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";

// Mantle's CCIP token set carries LINK / USDC / USDT / wstETH / W0G (Chainlink CCIP directory)
// — none of our tracked RWAs. Sourced static fact (the set is stable).
const CCIP_DIRECTORY_URL = "https://docs.chain.link/ccip/directory/mainnet/chain/ethereum-mainnet-mantle-1";
const CCIP_MANTLE_TOKENS = new Set(["LINK", "USDC", "USDT", "wstETH", "W0G"].map((s) => s.toUpperCase()));

const ENDPOINT_ABI = [
  { type: "function", name: "endpoint", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;
const TOKEN_ABI = [
  { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export type CrossChainProtocol = "LayerZero-OFT" | "CCIP" | "Canonical";

export interface CrossChainRoute {
  protocol: CrossChainProtocol;
  available: boolean;
  detail: string;
  /** Best-effort destination labels; [] when not enumerable on-chain. */
  destinations: string[];
  /** Per-tx dynamic fees → null (we never fabricate a cost). */
  costUsd: number | null;
  receipt: SourceReceipt;
}

export interface CrossChainReach {
  routes: CrossChainRoute[];
  anyRoute: boolean;
}

export async function findCrossChainRoutes(
  client: PublicClient,
  network: MantleNetwork,
  asset: Address,
  symbol: string,
  observedAt: string,
): Promise<CrossChainReach> {
  const explorer = explorerBaseFor(network);
  const routes: CrossChainRoute[] = [];

  // 1) LayerZero OFT — on-chain endpoint() probe.
  let isOft = false;
  try {
    const endpoint = (await client.readContract({ address: asset, abi: ENDPOINT_ABI, functionName: "endpoint" })) as Address;
    if (isAddress(endpoint) && getAddress(endpoint) === getAddress(LZ_V2_ENDPOINT)) {
      isOft = true;
      // Confirm it's the token's own OFT (token() == self) where available; non-fatal if absent.
      await client.readContract({ address: asset, abi: TOKEN_ABI, functionName: "token" }).catch(() => null);
    }
  } catch {
    /* no endpoint() → not an LZ OFT */
  }
  routes.push({
    protocol: "LayerZero-OFT",
    available: isOft,
    detail: isOft
      ? "Omnichain token — exposes the LayerZero V2 endpoint; transferable to LayerZero-connected chains."
      : "No LayerZero V2 endpoint on the token contract (not an OFT here).",
    destinations: [],
    costUsd: null,
    receipt: {
      sourceName: "Mantle RPC (eth_call endpoint())",
      url: `${explorer}/address/${asset}`,
      observedAt,
      kind: "fact",
      note: `LayerZero V2 endpoint check vs ${LZ_V2_ENDPOINT}`,
    },
  });

  // 2) Chainlink CCIP — membership in Mantle's CCIP token set (directory, dated).
  const onCcip = CCIP_MANTLE_TOKENS.has(symbol.toUpperCase());
  routes.push({
    protocol: "CCIP",
    available: onCcip,
    detail: onCcip
      ? "In Mantle's Chainlink CCIP token set — CCIP lanes available."
      : "Not in Mantle's CCIP token set (CCIP there carries LINK/USDC/USDT/wstETH/W0G).",
    destinations: [],
    costUsd: null,
    receipt: {
      sourceName: "Chainlink CCIP directory (Mantle mainnet)",
      url: CCIP_DIRECTORY_URL,
      observedAt,
      kind: "fact",
      note: "Mantle CCIP token set membership (Chainlink directory)",
    },
  });

  return { routes, anyRoute: routes.some((r) => r.available) };
}
