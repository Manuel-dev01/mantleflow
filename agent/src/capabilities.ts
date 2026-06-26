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

  const NO_GATE = (ts: string): Sourced<ComplianceGate> => ({
    value: { isGated: false, mechanism: null, evidence: [] },
    receipt: {
      sourceName: "n/a",
      url: "",
      observedAt: ts,
      kind: "assumption",
      note: "ETHERSCAN_API_KEY not set — compliance not source-verified",
    },
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

      const [reachability, liquidity, borrow, compliance] = await Promise.all([
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
          ? checkComplianceGate(client, network, addr, etherscan, ts).catch(() => NO_GATE(ts))
          : Promise.resolve(NO_GATE(ts)),
      ]);

      return assembleDistributionMap({
        asset: { symbol: asset.symbol, name: asset.name, address: asset.address, network },
        reachability,
        liquidity,
        borrow,
        compliance,
        generatedAt: ts,
      });
    },

    async compareAssets() {
      const symbols = Object.keys(TRACKED_ASSETS);
      const settled = await Promise.allSettled(symbols.map((s) => this.buildDistributionMap(s)));
      // One asset failing (e.g. a transient RPC error) must not sink the whole comparison.
      return settled
        .filter((r): r is PromiseFulfilledResult<DistributionMap> => r.status === "fulfilled")
        .map((r) => r.value);
    },

    trackedSymbols() {
      return Object.keys(TRACKED_ASSETS);
    },
  };
}
