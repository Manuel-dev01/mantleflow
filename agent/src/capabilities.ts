import { type Address } from "viem";
import { type AppConfig } from "./config/env.js";
import { type MantleNetwork, publicClientFor } from "./config/chains.js";
import { TRACKED_ASSETS } from "./config/addresses.js";
import { createEtherscanAdapter } from "./adapters/etherscan.js";
import { createDefiLlamaAdapter } from "./adapters/defillama.js";
import { readTokenFacts } from "./adapters/erc20.js";
import { findSecondaryVenues } from "./dex/reachability.js";
import { analyzeLiquidity } from "./dex/depth.js";
import { checkComplianceGate } from "./modules/compliance.js";
import { createPriceAdapter } from "./adapters/prices.js";
import { createLendleAdapter, type LendleReserve } from "./adapters/lendle.js";
import { findCrossChainRoutes } from "./adapters/crosschain.js";
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
  /** Distribution maps for every tracked asset (for the compare view). */
  compareAssets(): Promise<DistributionMap[]>;
  trackedSymbols(): string[];
}

function now(): string {
  return new Date().toISOString();
}

export function createCapabilities(config: AppConfig): Capabilities {
  const defillama = createDefiLlamaAdapter();
  const prices = createPriceAdapter("mantle");
  const lendle = createLendleAdapter();
  const etherscan = config.etherscanApiKey
    ? createEtherscanAdapter(config.etherscanApiKey)
    : null;

  // Used when compliance CANNOT be determined (no key, or Etherscan failed). `determined:false`
  // → the sub-score reports insufficient-data rather than a false "freely transferable".
  const UNKNOWN_GATE = (ts: string, why: string): Sourced<ComplianceGate> => ({
    value: { determined: false, isGated: false, mechanism: null, evidence: [] },
    receipt: { sourceName: "n/a", url: "", observedAt: ts, kind: "assumption", note: why },
  });

  function rpcFor(network: MantleNetwork): string {
    return network === "mainnet" ? config.mantleMainnetRpc : config.mantleSepoliaRpc;
  }

  function requireAsset(symbol: string) {
    const key = Object.keys(TRACKED_ASSETS).find(
      (k) => k.toLowerCase() === symbol.trim().toLowerCase(),
    );
    const asset = key ? TRACKED_ASSETS[key] : undefined;
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
      const client = publicClientFor(asset.network as MantleNetwork, rpcFor(asset.network as MantleNetwork));
      return readTokenFacts(client, asset.network as MantleNetwork, asset.address as Address, now());
    },

    async checkCompliance(symbol) {
      const asset = requireAsset(symbol);
      if (!etherscan) throw new Error("ETHERSCAN_API_KEY required for compliance source-verification");
      const client = publicClientFor(asset.network as MantleNetwork, rpcFor(asset.network as MantleNetwork));
      return checkComplianceGate(client, asset.network as MantleNetwork, asset.address as Address, etherscan, now());
    },

    async buildDistributionMap(symbol) {
      const asset = requireAsset(symbol);
      const network = asset.network as MantleNetwork;
      const client = publicClientFor(network, rpcFor(network));
      const addr = asset.address as Address;
      const ts = now();

      const [reachability, liquidity, borrow, compliance, crossChain] = await Promise.all([
        findSecondaryVenues(client, network, addr, defillama, ts),
        analyzeLiquidity(client, network, addr, defillama, prices, ts),
        lendle.readReserve(client, network, addr, ts).catch(
          (): Sourced<LendleReserve> => ({
            value: {
              listed: false,
              usageAsCollateralEnabled: false,
              borrowingEnabled: false,
              isFrozen: false,
              ltvPct: 0,
              liquidationThresholdPct: 0,
              supplyAprPct: 0,
              variableBorrowAprPct: 0,
              utilizationPct: 0,
              availableLiquidity: 0n,
              totalDebt: 0n,
              reserveDecimals: 0,
            },
            receipt: {
              sourceName: "Lendle ProtocolDataProvider (eth_call)",
              url: "",
              observedAt: ts,
              kind: "fact",
              note: "reserve read reverted — treated as not listed",
            },
          }),
        ),
        etherscan
          ? checkComplianceGate(client, network, addr, etherscan, ts).catch(() =>
              UNKNOWN_GATE(ts, "Etherscan compliance check failed (rate limit / transient)"),
            )
          : Promise.resolve(UNKNOWN_GATE(ts, "ETHERSCAN_API_KEY not set — compliance not source-verified")),
        findCrossChainRoutes(client, network, addr, asset.symbol, ts).catch(() => undefined),
      ]);

      return assembleDistributionMap({
        asset: { symbol: asset.symbol, name: asset.name, address: asset.address, network },
        reachability,
        liquidity,
        borrow,
        compliance,
        crossChain,
        generatedAt: ts,
      });
    },

    async compareAssets() {
      // Sequential, not Promise.all: 6 parallel builds would fire 6 large DefiLlama /pools
      // downloads + 6 Etherscan bursts at once, saturating the function and starving compliance.
      // Doing them in order lets asset 1 warm the shared caches; the rest reuse them and the
      // Etherscan calls spread out under the rate limit. One failure must not sink the rest.
      const maps: DistributionMap[] = [];
      for (const s of Object.keys(TRACKED_ASSETS)) {
        try {
          maps.push(await this.buildDistributionMap(s));
        } catch {
          /* skip a transiently-failing asset */
        }
      }
      return maps;
    },

    trackedSymbols() {
      return Object.keys(TRACKED_ASSETS);
    },
  };
}
