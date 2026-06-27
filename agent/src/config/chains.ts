import { mantle, mantleSepoliaTestnet } from "viem/chains";
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/**
 * Mantle network configuration. Values verified in docs/VERIFIED.md (2026-06-25):
 * mainnet chainId 5000, Sepolia chainId 5003. Gas token MNT.
 */
export const MANTLE_MAINNET_RPC = "https://rpc.mantle.xyz";
export const MANTLE_SEPOLIA_RPC = "https://rpc.sepolia.mantle.xyz";

export const EXPLORER_MAINNET = "https://explorer.mantle.xyz";
export const EXPLORER_SEPOLIA = "https://explorer.sepolia.mantle.xyz";

export type MantleNetwork = "mainnet" | "sepolia";

export function publicClientFor(
  network: MantleNetwork,
  rpcUrl?: string,
): PublicClient {
  if (network === "mainnet") {
    return createPublicClient({
      chain: mantle,
      transport: http(rpcUrl ?? MANTLE_MAINNET_RPC),
    });
  }
  return createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(rpcUrl ?? MANTLE_SEPOLIA_RPC),
  });
}

export function explorerBaseFor(network: MantleNetwork): string {
  return network === "mainnet" ? EXPLORER_MAINNET : EXPLORER_SEPOLIA;
}

/** Derive the agent's account from a 0x private key (testnet-only — Sepolia writes). */
export function accountFromKey(privateKey: string): PrivateKeyAccount {
  return privateKeyToAccount(privateKey as `0x${string}`);
}

/**
 * Write-capable client for Mantle Sepolia (ERC-8004 identity/reputation writes). Pairs a viem
 * WalletClient (signing) with a PublicClient (reads/simulation/receipts) over the same RPC.
 */
export function walletClientForSepolia(
  privateKey: string,
  rpcUrl?: string,
): { wallet: WalletClient; account: PrivateKeyAccount; public: PublicClient } {
  const account = accountFromKey(privateKey);
  const transport = http(rpcUrl ?? MANTLE_SEPOLIA_RPC);
  return {
    account,
    wallet: createWalletClient({ account, chain: mantleSepoliaTestnet, transport }),
    public: createPublicClient({ chain: mantleSepoliaTestnet, transport }),
  };
}
