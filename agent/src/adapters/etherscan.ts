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

// Etherscan's free tier limits to ~5 req/s. The compare view fans out 6 assets at once; cap
// concurrent Etherscan calls so the burst stays under the limit and every gate resolves.
const MAX_CONCURRENT = 1;
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
  return {
    async getContractSource(network, address, observedAt) {
      const url =
        `${V2_BASE}?chainid=${chainId(network)}&module=contract&action=getsourcecode` +
        `&address=${address}&apikey=${apiKey}`;

      // Etherscan signals rate limits with HTTP 200 + status "0" (so fetchJson's HTTP retry can't
      // see them). Serialise calls (cap 1) and retry on any non-success with backoff. Successful
      // responses are cached 10 min (cacheIf) so warmed assets stay resolved across requests.
      const res = await withLimit(async () => {
        let r!: SourceCodeResponse;
        for (let attempt = 0; attempt < 6; attempt++) {
          r = await fetchJson<SourceCodeResponse>(url, {
            ttlMs: 10 * 60_000,
            cacheIf: (v) => v.status === "1",
          });
          if (r.status === "1") break;
          await new Promise((res2) => setTimeout(res2, 350 * (attempt + 1)));
        }
        return r;
      });
      const row = Array.isArray(res.result) ? res.result[0] : undefined;
      if (res.status !== "1" || !row) {
        throw new Error(`Etherscan V2 getsourcecode failed: ${res.message} (${String(res.result)})`);
      }
      const implRaw = row.Implementation ?? "";
      const source: ContractSource = {
        contractName: row.ContractName ?? "",
        abi: row.ABI ?? "",
        isProxy: row.Proxy === "1",
        implementation: /^0x[0-9a-fA-F]{40}$/.test(implRaw) ? (implRaw as Address) : null,
        sourceCode: row.SourceCode ?? "",
      };
      return sourced(source, {
        sourceName: "Mantlescan (Etherscan API V2)",
        url: `https://mantlescan.xyz/address/${address}#code`,
        observedAt,
        kind: "fact",
        note: `getsourcecode chainid=${chainId(network)}`,
      });
    },
  };
}
