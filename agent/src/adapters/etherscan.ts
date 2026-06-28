import type { Address } from "viem";
import { fetchJson } from "../lib/http.js";
import { type MantleNetwork } from "../config/chains.js";
import { type Sourced, sourced } from "../types/source-receipt.js";

/**
 * Mantlescan via the unified Etherscan API V2 (V1 is deprecated, 2026-06-25 — see VERIFIED.md).
 * One endpoint, `chainid` selects the network: 5000 mainnet, 5003 Sepolia.
 */
const V2_BASE = "https://api.etherscan.io/v2/api";

function chainId(network: MantleNetwork): number {
  return network === "mainnet" ? 5000 : 5003;
}

interface EtherscanResponse<T> {
  status: string; // "1" ok, "0" error
  message: string;
  result: T;
}

type SourceCodeResponse = EtherscanResponse<Array<Record<string, string>>>;
type AbiResponse = EtherscanResponse<string>;

// Function names that mark a contract as a proxy (so we don't false-clear a proxy in the lightweight
// getabi fallback, where we can't resolve the implementation).
const PROXY_FN_HINTS = ["implementation", "upgradeTo", "upgradeToAndCall"];

function abiLooksLikeProxy(abiJson: string): boolean {
  try {
    const abi = JSON.parse(abiJson) as Array<{ type?: string; name?: string }>;
    const fns = new Set(abi.filter((e) => e.type === "function" && e.name).map((e) => e.name as string));
    return PROXY_FN_HINTS.some((f) => fns.has(f));
  } catch {
    return false;
  }
}

// Etherscan's free tier limits to ~5 req/s. The compare view fans out 6 assets at once; cap
// concurrent Etherscan calls so the burst stays under the limit and every gate resolves.
const MAX_CONCURRENT = 2;
let active = 0;
const waiters: Array<() => void> = [];
async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((res) => waiters.push(res));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

export interface ContractSource {
  contractName: string;
  abi: string; // JSON string, or "Contract source code not verified"
  isProxy: boolean;
  implementation: Address | null;
  sourceCode: string;
}

export interface EtherscanAdapter {
  getContractSource(
    network: MantleNetwork,
    address: Address,
    observedAt: string,
  ): Promise<Sourced<ContractSource>>;
}

export function createEtherscanAdapter(apiKey: string): EtherscanAdapter {
  // Lightweight fallback: getabi returns ONLY the ABI (~10× smaller than getsourcecode's full
  // verified source). Some contracts (e.g. fBTC's ~88KB source) trip Node's fetch on the larger
  // payload; the tiny getabi response is far more reliable. We lose the explorer-reported Proxy/Impl
  // fields, so we detect proxy-ness from the ABI and, if it looks like a proxy, refuse to resolve
  // (the caller reports insufficient-data rather than false-clearing a proxy's gates).
  async function getAbiFallback(network: MantleNetwork, address: Address): Promise<ContractSource | null> {
    const url = `${V2_BASE}?chainid=${chainId(network)}&module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
    const r = await withLimit(async () => {
      let last: AbiResponse | undefined;
      let lastErr: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          last = await fetchJson<AbiResponse>(url, { ttlMs: 10 * 60_000, cacheIf: (v) => v.status === "1" });
          if (last.status === "1") return last;
        } catch (err) {
          lastErr = err;
        }
        await new Promise((r2) => setTimeout(r2, 300 * (attempt + 1)));
      }
      if (last) return last;
      throw lastErr ?? new Error("getabi failed");
    });
    if (r.status !== "1" || typeof r.result !== "string" || r.result.startsWith("Contract source code not")) {
      return null;
    }
    return {
      contractName: "",
      abi: r.result,
      isProxy: abiLooksLikeProxy(r.result),
      implementation: null, // getabi can't resolve the impl — flagged isProxy when it looks like one
      sourceCode: "",
    };
  }

  return {
    async getContractSource(network, address, observedAt) {
      const url =
        `${V2_BASE}?chainid=${chainId(network)}&module=contract&action=getsourcecode` +
        `&address=${address}&apikey=${apiKey}`;

      // Etherscan signals rate limits with HTTP 200 + status "0" (so fetchJson's HTTP retry can't
      // see them). Serialise calls (cap 2) and retry on any non-success with backoff. Successful
      // responses are cached 10 min (cacheIf) so warmed assets stay resolved across requests.
      let source: ContractSource | null = null;
      let via = "getsourcecode";
      try {
        const res = await withLimit(async () => {
          let r: SourceCodeResponse | undefined;
          let lastErr: unknown;
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              r = await fetchJson<SourceCodeResponse>(url, {
                ttlMs: 10 * 60_000,
                cacheIf: (v) => v.status === "1",
              });
              if (r.status === "1") return r;
            } catch (err) {
              lastErr = err; // network throw (e.g. fetch failed under concurrency) — retry
            }
            await new Promise((res2) => setTimeout(res2, 350 * (attempt + 1)));
          }
          if (r) return r;
          throw lastErr ?? new Error("Etherscan request failed");
        });
        const row = Array.isArray(res.result) ? res.result[0] : undefined;
        if (res.status === "1" && row) {
          const implRaw = row.Implementation ?? "";
          source = {
            contractName: row.ContractName ?? "",
            abi: row.ABI ?? "",
            isProxy: row.Proxy === "1",
            implementation: /^0x[0-9a-fA-F]{40}$/.test(implRaw) ? (implRaw as Address) : null,
            sourceCode: row.SourceCode ?? "",
          };
        }
      } catch {
        /* getsourcecode failed (e.g. large payload tripped fetch) — try the lighter getabi below */
      }

      if (!source) {
        source = await getAbiFallback(network, address);
        via = "getabi (fallback)";
      }
      if (!source) {
        throw new Error(`Etherscan V2 getsourcecode + getabi both failed for ${address}`);
      }

      return sourced(source, {
        sourceName: "Mantlescan (Etherscan API V2)",
        url: `https://mantlescan.xyz/address/${address}#code`,
        observedAt,
        kind: "fact",
        note: `${via} chainid=${chainId(network)}`,
      });
    },
  };
}
