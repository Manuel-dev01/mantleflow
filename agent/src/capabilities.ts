import { type Address } from "viem";
import { type AppConfig } from "./config/env.js";
import { type MantleNetwork, publicClientFor } from "./config/chains.js";
import { TRACKED_ASSETS } from "./config/addresses.js";
import { createEtherscanAdapter } from "./adapters/etherscan.js";
import { createDefiLlamaAdapter } from "./adapters/defillama.js";
import { readTokenFacts } from "./adapters/erc20.js";
import { findSecondaryVenues } from "./dex/reachability.js";
import { checkComplianceGate } from "./modules/compliance.js";
import { assembleDistributionMap } from "./engine/engine.js";
import { type ComplianceGate, type DistributionMap } from "./engine/types.js";
import { type Sourced } from "./types/source-receipt.js";

/**
 * The capability layer: single deterministic functions that read real Mantle data and return
 * Sourced results. The engine composes them into a DistributionMap; the orchestrator exposes the
 * same functions as Anthropic tools. One implementation, two consumers.
 */
export interface Capabilities {
  resolveAsset(query: string): typeof TRACKED_ASSETS[string] | null;
  getTokenFacts(symbol: string): Promise<Sourced<Awaited<ReturnType<typeof readTokenFacts>>["value"]>>;
  checkCompliance(symbol: string): Promise<Sourced<ComplianceGate>>;
  buildDistributionMap(symbol: string): Promise<DistributionMap>;
}

function now(): string {
  return new Date().toISOString();
}

export function createCapabilities(config: AppConfig): Capabilities {
  const defillama = createDefiLlamaAdapter();
  const etherscan = config.etherscanApiKey
    ? createEtherscanAdapter(config.etherscanApiKey)
    : null;

  function requireAsset(symbol: string) {
    const asset = TRACKED_ASSETS[symbol.toUpperCase()];
    if (!asset) throw new Error(`Unknown asset "${symbol}". Tracked: ${Object.keys(TRACKED_ASSETS).join(", ")}`);
    return asset;
  }

  return {
    resolveAsset(query) {
      const q = query.toUpperCase();
      for (const [sym, asset] of Object.entries(TRACKED_ASSETS)) {
        if (q.includes(sym) || q.includes(asset.name.toUpperCase())) return asset;
      }
      return null;
    },

    async getTokenFacts(symbol) {
      const asset = requireAsset(symbol);
      const client = publicClientFor(asset.network as MantleNetwork);
      return readTokenFacts(client, asset.network as MantleNetwork, asset.address as Address, now());
    },

    async checkCompliance(symbol) {
      const asset = requireAsset(symbol);
      if (!etherscan) throw new Error("ETHERSCAN_API_KEY required for compliance source-verification");
      const client = publicClientFor(asset.network as MantleNetwork);
      return checkComplianceGate(client, asset.network as MantleNetwork, asset.address as Address, etherscan, now());
    },

    async buildDistributionMap(symbol) {
      const asset = requireAsset(symbol);
      const network = asset.network as MantleNetwork;
      const client = publicClientFor(network);
      const ts = now();

      const [reachability, compliance] = await Promise.all([
        findSecondaryVenues(client, network, asset.address as Address, defillama, ts),
        etherscan
          ? checkComplianceGate(client, network, asset.address as Address, etherscan, ts)
          : Promise.resolve<Sourced<ComplianceGate>>({
              value: { isGated: false, mechanism: null, evidence: [] },
              receipt: {
                sourceName: "n/a",
                url: "",
                observedAt: ts,
                kind: "assumption",
                note: "ETHERSCAN_API_KEY not set — compliance not source-verified",
              },
            }),
      ]);

      return assembleDistributionMap({
        asset: { symbol: asset.symbol, name: asset.name, address: asset.address, network },
        reachability,
        compliance,
        generatedAt: ts,
      });
    },
  };
}
