import type { Address } from "viem";

/**
 * Mantle DEX factories used for secondary-market reachability checks.
 * Addresses from official docs (primary source) — VERIFIED.md records them as candidate and the
 * reachability module confirms `getCode` at runtime before trusting a result. Phase 2 adds Agni.
 */
export interface DexFactory {
  name: string;
  /** "v2" = Uniswap-V2-style getPair(a,b); "lb" = Merchant Moe Liquidity Book. */
  kind: "v2" | "lb";
  address: Address;
  source: string;
}

export const MANTLE_DEX_FACTORIES: DexFactory[] = [
  {
    name: "Merchant Moe (classic)",
    kind: "v2",
    address: "0x5bEF015CA9424A7C07B68490616a4C1F094BEDEc",
    source: "https://docs.merchantmoe.com/resources/contracts",
  },
  {
    name: "Merchant Moe (Liquidity Book 2.2)",
    kind: "lb",
    address: "0xa6630671775c4EA2743840F9A5016dCf2A104054",
    source: "https://docs.merchantmoe.com/resources/contracts",
  },
];

/** Common quote tokens on Mantle to test pairings against (mainnet). */
export const QUOTE_TOKENS: { symbol: string; address: Address; decimals: number }[] = [
  { symbol: "USDC", address: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", decimals: 6 },
  { symbol: "WMNT", address: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", decimals: 18 },
  { symbol: "USDT", address: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", decimals: 6 },
  { symbol: "WETH", address: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111", decimals: 18 },
];
