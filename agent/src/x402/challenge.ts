import { type AppConfig } from "../config/env.js";
import { type X402Challenge } from "./types.js";

/** CAIP-2 network id + chainId per x402 network. */
export const X402_NETWORKS = {
  sepolia: { caip2: "eip155:5003", chainId: 5003 },
  mainnet: { caip2: "eip155:5000", chainId: 5000 },
} as const;

/**
 * EIP-712 domain `{name, version}` of the settlement token (must match the deployed token exactly).
 * Sepolia = our tmUSD; mainnet = Circle USDC v2. The buyer signs the TransferWithAuthorization with
 * this domain (+ chainId + verifyingContract=asset).
 */
export const X402_ASSET_DOMAIN = {
  sepolia: { name: "MantleFlow Test USD", version: "1" },
  mainnet: { name: "USD Coin", version: "2" },
} as const;

export const X402_VERSION = 1;

/** Build the 402 challenge body for a gated resource. */
export function buildChallenge(config: AppConfig, resource: string): X402Challenge {
  const net = X402_NETWORKS[config.x402Network];
  const domain = X402_ASSET_DOMAIN[config.x402Network];
  return {
    x402Version: X402_VERSION,
    accepts: [
      {
        scheme: "exact",
        network: net.caip2,
        asset: config.x402Asset!,
        maxAmountRequired: config.x402PriceAtomic,
        payTo: config.x402PayTo!,
        resource,
        description: "MantleFlow deep AI distribution analysis (one query).",
        mimeType: "application/json",
        maxTimeoutSeconds: 300,
        extra: { name: domain.name, version: domain.version },
      },
    ],
  };
}
