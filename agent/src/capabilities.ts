import { type Address } from "viem";
import { type AppConfig } from "./config/env.js";
import { type MantleNetwork, publicClientFor } from "./config/chains.js";
import { TRACKED_ASSETS } from "./config/addresses.js";
import { createEtherscanAdapter } from "./adapters/etherscan.js";
import { createDefiLlamaAdapter } from "./adapters/defillama.js";
import { createGeckoTerminalAdapter } from "./adapters/geckoterminal.js";
import { readTokenFacts } from "./adapters/erc20.js";
import { findSecondaryVenues } from "./dex/reachability.js";
import { analyzeLiquidity } from "./dex/depth.js";
import { checkComplianceGate } from "./modules/compliance.js";
import { createPriceAdapter } from "./adapters/prices.js";
import { createLendleAdapter, type LendleReserve } from "./adapters/lendle.js";
import { findCrossChainRoutes } from "./adapters/crosschain.js";
import { assembleDistributionMap } from "./engine/engine.js";
import { type AssetContext, type AssetMarketFacts, type ComplianceGate, type DistributionMap } from "./engine/types.js";
import { resolveToAsset, type ResolvedAsset, type ResolveDeps } from "./assets/resolve.js";
import { classifyAsset } from "./assets/classify.js";
import { type Sourced } from "./types/source-receipt.js";

/**
 * The capability layer: single deterministic functions that read real Mantle data and return
 * Sourced results. The engine composes them into a DistributionMap; the orchestrator exposes the
 * same functions as Anthropic tools. One implementation, two consumers.
 */
export interface FeaturedAsset {
  symbol: string;
  name: string;
  network: MantleNetwork;
  curated: true;
}

export interface Capabilities {
  /** Resolve a symbol / name / contract address (curated or arbitrary) → a ResolvedAsset, or null. */
  resolveAsset(query: string, network?: MantleNetwork): Promise<ResolvedAsset | null>;
  getTokenFacts(symbol: string): Promise<Sourced<Awaited<ReturnType<typeof readTokenFacts>>["value"]>>;
  checkCompliance(symbol: string): Promise<Sourced<ComplianceGate>>;
  /** Build the map for a curated symbol OR an arbitrary token address, on mainnet (default) or sepolia. */
  buildDistributionMap(input: string, network?: MantleNetwork): Promise<DistributionMap>;
  /** Distribution maps for every curated/featured asset (for the compare view). */
  compareAssets(): Promise<DistributionMap[]>;
  /** The curated featured asset descriptors (for the UI chips + MCP list). */
  getFeaturedAssets(): FeaturedAsset[];
  trackedSymbols(): string[];
}

function now(): string {
  return new Date().toISOString();
}

export function createCapabilities(config: AppConfig): Capabilities {
  const defillama = createDefiLlamaAdapter();
  const gt = createGeckoTerminalAdapter();
  const prices = createPriceAdapter("mantle");
  const lendle = createLendleAdapter();
  const etherscan = config.etherscanApiKey
    ? createEtherscanAdapter(config.etherscanApiKey)
    : null;

  // Used when compliance CANNOT be determined (no key, or Etherscan failed). `determined:false`
  // → the sub-score reports insufficient-data rather than a false "freely transferable".
  const UNKNOWN_GATE = (ts: string, why: string): Sourced<ComplianceGate> => ({
    value: { determined: false, isGated: false, tier: null, mechanism: null, evidence: [] },
    receipt: { sourceName: "n/a", url: "", observedAt: ts, kind: "assumption", note: why },
  });

  function rpcFor(network: MantleNetwork): string {
    return network === "mainnet" ? config.mantleMainnetRpc : config.mantleSepoliaRpc;
  }

  function clientFor(network: MantleNetwork) {
    return publicClientFor(network, rpcFor(network));
  }

  /** Resolve any input (curated symbol/name, arbitrary address, or uncurated search) or throw. */
  async function resolve(input: string, network: MantleNetwork, ts: string): Promise<ResolvedAsset> {
    const deps: ResolveDeps = { client: clientFor(network), gt };
    const resolved = await resolveToAsset(input, network, deps, ts);
    if (!resolved) {
      throw new Error(
        `Could not resolve "${input}" to a Mantle asset. Provide a tracked symbol (${Object.keys(TRACKED_ASSETS).join(", ")}) or a contract address.`,
      );
    }
    return resolved;
  }

  return {
    async resolveAsset(query, network = "mainnet") {
      const deps: ResolveDeps = { client: clientFor(network), gt };
      return resolveToAsset(query, network, deps, now());
    },

    async getTokenFacts(symbol) {
      const ts = now();
      const asset = await resolve(symbol, "mainnet", ts);
      return readTokenFacts(clientFor(asset.network), asset.network, asset.address, ts);
    },

    async checkCompliance(symbol) {
      const ts = now();
      const asset = await resolve(symbol, "mainnet", ts);
      if (!etherscan) throw new Error("ETHERSCAN_API_KEY required for compliance source-verification");
      return checkComplianceGate(clientFor(asset.network), asset.network, asset.address, etherscan, ts);
    },

    async buildDistributionMap(input, networkArg) {
      const ts = now();
      const asset = await resolve(input, (networkArg ?? "mainnet") as MantleNetwork, ts);
      const network = asset.network; // curated symbols carry their own network (mainnet)
      const client = clientFor(network);
      const addr = asset.address;

      // Fetch GeckoTerminal pools ONCE and share with reachability + depth so they never disagree on
      // availability (a separate failed call must not make one say "no venue" while the other shows 20).
      const gtPools = await gt.poolsResult(network, addr, ts);
      const [reachability, liquidity, borrow, compliance, crossChain, market, tokenFacts] = await Promise.all([
        findSecondaryVenues(client, network, addr, defillama, gtPools, ts),
        analyzeLiquidity(client, network, addr, defillama, gtPools, prices, ts),
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
        gt.tokenMarket(network, addr, ts).catch(() => null),
        readTokenFacts(client, network, addr, ts).catch(() => null),
      ]);

      // Token market facts (price/mcap/FDV/24h vol from GeckoTerminal; supply on-chain) — shown per
      // asset so even illiquid ones surface real context. Omit when nothing was sourced.
      const receipts = [market?.receipt, tokenFacts?.receipt].filter((r): r is NonNullable<typeof r> => !!r);
      const facts: AssetMarketFacts | undefined =
        market || tokenFacts
          ? {
              priceUsd: market?.value.priceUsd ?? null,
              marketCapUsd: market?.value.marketCapUsd ?? null,
              fdvUsd: market?.value.fdvUsd ?? null,
              volume24hUsd: market?.value.volume24hUsd ?? null,
              totalSupply: tokenFacts?.value.totalSupply != null ? tokenFacts.value.totalSupply.toString() : null,
              decimals: tokenFacts?.value.decimals ?? asset.decimals ?? null,
              receipts,
            }
          : undefined;

      // Best-effort third-party context (GeckoTerminal listing / logo / curated issuer) — attributed,
      // never fabricated; and a heuristic RWA classification (soft label for the RWA-focused product).
      const context: AssetContext = {
        description: null,
        category: null,
        issuerHint: asset.issuer ?? null,
        imageUrl: market?.value.imageUrl ?? null,
        coingeckoId: market?.value.coingeckoId ?? null,
        receipts: market ? [market.receipt] : [],
      };
      const classification = classifyAsset({
        curated: asset.curated,
        symbol: asset.symbol,
        name: asset.name,
        complianceDetermined: compliance.value.determined,
        complianceTier: compliance.value.tier,
        context,
        issuer: asset.issuer,
        observedAt: ts,
      });

      return assembleDistributionMap({
        asset: {
          symbol: asset.symbol,
          name: asset.name,
          address: asset.address,
          network,
          curated: asset.curated,
          classification,
          context,
        },
        ...(facts ? { facts } : {}),
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

    getFeaturedAssets() {
      return Object.values(TRACKED_ASSETS).map((a) => ({
        symbol: a.symbol,
        name: a.name,
        network: a.network as MantleNetwork,
        curated: true as const,
      }));
    },

    trackedSymbols() {
      return Object.keys(TRACKED_ASSETS);
    },
  };
}
