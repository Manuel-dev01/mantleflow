"use client";

import { createWalletClient, custom, type Address, type Hex } from "viem";

// Mantle networks for browser-wallet flows (minimal window.ethereum, no wagmi/RainbowKit):
//  - mainnet (5000) — the visitor's "Rate this agent" flow (ERC-8004 reputation lives on mainnet).
//  - sepolia (5003) — the x402 pay-per-query flow (testnet tmUSD).
export type WalletNetwork = "mainnet" | "sepolia";
const CHAINS: Record<WalletNetwork, { chainIdHex: string; params: Record<string, unknown> }> = {
  mainnet: {
    chainIdHex: "0x1388", // 5000
    params: {
      chainId: "0x1388",
      chainName: "Mantle",
      nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
      rpcUrls: ["https://rpc.mantle.xyz"],
      blockExplorerUrls: ["https://explorer.mantle.xyz"],
    },
  },
  sepolia: {
    chainIdHex: "0x138b", // 5003
    params: {
      chainId: "0x138b",
      chainName: "Mantle Sepolia Testnet",
      nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
      rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
      blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"],
    },
  },
};

interface Eip1193 {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}

function eth(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export function hasWallet(): boolean {
  return eth() !== null;
}

/** Connect the injected wallet and ensure it is on the given Mantle network. Returns the address. */
export async function connect(network: WalletNetwork): Promise<Address> {
  const provider = eth();
  if (!provider) throw new Error("No wallet found. Install MetaMask (or any EIP-1193 wallet).");
  const chain = CHAINS[network];

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0] as Address;

  const current = (await provider.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() !== chain.chainIdHex) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.chainIdHex }] });
    } catch {
      await provider.request({ method: "wallet_addEthereumChain", params: [chain.params] });
    }
  }
  return account;
}

/** Back-compat shim — x402 pay-per-query stays on Sepolia. */
export async function connectSepolia(): Promise<Address> {
  return connect("sepolia");
}

/** Write a giveFeedback tx from the visitor's own wallet (genuine third-party reputation). */
export async function giveFeedback(args: {
  account: Address;
  reputationRegistry: Address;
  abi: readonly unknown[];
  agentId: string;
  score: number; // 1..5
  endpoint: string;
}): Promise<Hex> {
  const provider = eth();
  if (!provider) throw new Error("No wallet found.");
  const wallet = createWalletClient({ account: args.account, transport: custom(provider) });
  return wallet.writeContract({
    address: args.reputationRegistry,
    abi: args.abi as never,
    functionName: "giveFeedback",
    args: [
      BigInt(args.agentId),
      BigInt(args.score),
      0, // valueDecimals
      "user-rating",
      "",
      args.endpoint,
      "",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
    chain: null,
  });
}
