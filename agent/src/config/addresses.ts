import type { Address } from "viem";

/**
 * Contract addresses used by MantleFlow. Every address here is ON-CHAIN VERIFIED
 * (eth_getCode + a read). No address is write-trusted until it has been confirmed
 * on-chain; these have been.
 */

export interface Erc8004Registries {
  /** ERC-8004 Identity Registry. Confirmed: name() => "AgentIdentity", symbol() => "AGENT". */
  identity: Address;
  /** ERC-8004 Reputation Registry. Confirmed: deployed ERC-1967 proxy. */
  reputation: Address;
  /** ERC-8004 Validation Registry — NOT deployed on Mantle. */
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

/** USDC on Mantle mainnet (EIP-3009 capable) — x402 settlement asset. */
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
}

export const TRACKED_ASSETS: Record<string, TrackedAsset> = {
  MI4: {
    symbol: "MI4",
    name: "Mantle Index Four",
    network: "mainnet",
    address: "0x671642ac281c760e34251d51bc9eef27026f3b7a",
    decimals: 6,
    issuer: "Securitize (transfer agent) / Mantle Guard Ltd",
    isProxy: true,  },
  // Additional tracked assets — all on-chain verified (getCode + price).
  mETH: {
    symbol: "mETH",
    name: "Mantle Staked Ether",
    network: "mainnet",
    address: "0xcDA86A272531e8640cD7F1a92c01839911B90bb0",
    decimals: 18,
    issuer: "mETH Protocol (Mantle)",  },
  cmETH: {
    symbol: "cmETH",
    name: "Mantle Restaked ETH",
    network: "mainnet",
    address: "0xE6829d9a7eE3040e1276Fa75293Bde931859e8fA",
    decimals: 18,
    issuer: "mETH Protocol (Mantle)",
    isProxy: true,  },
  fBTC: {
    symbol: "fBTC",
    name: "FunctionBTC",
    network: "mainnet",
    address: "0xC96dE26018A54D51c097160568752c4E3BD6C364",
    decimals: 8,
    issuer: "Function (Galaxy/Antalpha-backed omnichain BTC)",  },
  USDe: {
    symbol: "USDe",
    name: "Ethena USDe",
    network: "mainnet",
    address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    decimals: 18,
    issuer: "Ethena (OFT)",  },
  USDY: {
    symbol: "USDY",
    name: "Ondo US Dollar Yield",
    network: "mainnet",
    address: "0x5bE26527e817998A7206475496fDE1E68957c5A6",
    decimals: 18,
    issuer: "Ondo Finance (blocklist transfer hook)",
    isProxy: true,  },
  // NOTE: syrupUSDT (Maple) is intentionally NOT tracked — Maple withdrew it from Aave-on-Mantle.
  // Recorded as a thesis finding ("an RWA that left Mantle"), not an omission.
};

/** Lendle (Aave-v2 fork) — Mantle borrowability source. On-chain verified. */
export const LENDLE = {
  lendingPool: "0xCFa5aE7c2CE8Fadc6426C1ff872cA45378Fb7cF3" as Address,
  protocolDataProvider: "0x552b9e4bae485C4B7F540777d7D25614CdB84773" as Address,
  addressesProvider: "0xAb94Bedd21ae3411eB2698945dfCab1D5C19C3d4" as Address,
};
