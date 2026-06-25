import type { Address } from "viem";

/**
 * Contract addresses used by MantleFlow. Every address here is ON-CHAIN VERIFIED
 * (eth_getCode + a read) on 2026-06-25 — see docs/VERIFIED.md. Per docs/DECISIONS.md #6,
 * no address is write-trusted until it has been confirmed on-chain; these have been.
 */

export interface Erc8004Registries {
  /** ERC-8004 Identity Registry. Confirmed: name() => "AgentIdentity", symbol() => "AGENT". */
  identity: Address;
  /** ERC-8004 Reputation Registry. Confirmed: deployed ERC-1967 proxy. */
  reputation: Address;
  /** ERC-8004 Validation Registry — NOT deployed on Mantle as of 2026-06-25. */
  validation: Address | null;
}

export const ERC8004: Record<"mainnet" | "sepolia", Erc8004Registries> = {
  mainnet: {
    identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    validation: null,
  },
  sepolia: {
    identity: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputation: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    validation: null,
  },
};

/** USDC on Mantle mainnet (EIP-3009 capable) — x402 settlement asset. Verified 2026-06-25. */
export const USDC_MANTLE_MAINNET: Address =
  "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9";

/**
 * Tracked Mantle RWA / capital-market assets. MI4 is the Phase-1 centerpiece.
 * Securitize is MI4's transfer agent — its token is a proxy whose compliance/transfer
 * restriction logic lives in the implementation contract (the gating signal we detect).
 */
export interface TrackedAsset {
  symbol: string;
  name: string;
  network: "mainnet" | "sepolia";
  address: Address;
  decimals: number;
  issuer?: string;
  /** True if the deployed token is a proxy (impl holds the real logic — inspect it for gates). */
  isProxy?: boolean;
  verifiedAt: string; // ISO date the address+metadata were on-chain confirmed
}

export const TRACKED_ASSETS: Record<string, TrackedAsset> = {
  MI4: {
    symbol: "MI4",
    name: "Mantle Index Four",
    network: "mainnet",
    address: "0x671642ac281c760e34251d51bc9eef27026f3b7a",
    decimals: 6,
    issuer: "Securitize (transfer agent) / Mantle Guard Ltd",
    isProxy: true,
    verifiedAt: "2026-06-25",
  },
};
