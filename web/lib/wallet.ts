"use client";

import { createWalletClient, custom, type Address, type Hex } from "viem";

// Mantle Sepolia (5003) — for the visitor's "Rate this agent" flow. Minimal window.ethereum
// integration (no wagmi/RainbowKit).
const SEPOLIA = {
  chainIdHex: "0x138b", // 5003
  params: {
    chainId: "0x138b",
    chainName: "Mantle Sepolia Testnet",
    nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
    blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"],
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

/** Connect the injected wallet and ensure it is on Mantle Sepolia. Returns the selected address. */
export async function connectSepolia(): Promise<Address> {
  const provider = eth();
  if (!provider) throw new Error("No wallet found. Install MetaMask (or any EIP-1193 wallet).");

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0] as Address;

  const current = (await provider.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() !== SEPOLIA.chainIdHex) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA.chainIdHex }] });
    } catch {
      await provider.request({ method: "wallet_addEthereumChain", params: [SEPOLIA.params] });
    }
  }
  return account;
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
