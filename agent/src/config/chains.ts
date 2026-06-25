import { mantle, mantleSepoliaTestnet } from "viem/chains";
import { createPublicClient, http, type PublicClient } from "viem";

/**
 * Mantle network configuration. Values verified in docs/VERIFIED.md (2026-06-25):
 * mainnet chainId 5000, Sepolia chainId 5003. Gas token MNT.
 */
export const MANTLE_MAINNET_RPC = "https://rpc.mantle.xyz";
export const MANTLE_SEPOLIA_RPC = "https://rpc.sepolia.mantle.xyz";

export const EXPLORER_MAINNET = "https://explorer.mantle.xyz";
export const EXPLORER_SEPOLIA = "https://explorer.sepolia.mantle.xyz";

export type MantleNetwork = "mainnet" | "sepolia";

export function publicClientFor(network: MantleNetwork): PublicClient {
  if (network === "mainnet") {
    return createPublicClient({
      chain: mantle,
      transport: http(MANTLE_MAINNET_RPC),
    });
  }
  return createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(MANTLE_SEPOLIA_RPC),
  });
}

export function explorerBaseFor(network: MantleNetwork): string {
  return network === "mainnet" ? EXPLORER_MAINNET : EXPLORER_SEPOLIA;
}
