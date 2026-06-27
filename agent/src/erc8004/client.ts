import {
  type Address,
  type Hex,
  createPublicClient,
  http,
  keccak256,
  stringToHex,
  getAddress,
} from "viem";
import { mantleSepoliaTestnet } from "viem/chains";
import { type AppConfig } from "../config/env.js";
import { walletClientForSepolia, EXPLORER_SEPOLIA } from "../config/chains.js";
import { ERC8004 } from "../config/addresses.js";
import { IDENTITY_ABI, REPUTATION_ABI, PROVENANCE_TAG1 } from "./abis.js";
import { type Sourced, type SourceReceipt, sourced } from "../types/source-receipt.js";

const REG = ERC8004.sepolia;

function txUrl(hash: Hex): string {
  return `${EXPLORER_SEPOLIA}/tx/${hash}`;
}
function addrUrl(addr: string): string {
  return `${EXPLORER_SEPOLIA}/address/${addr}`;
}

/** Deterministic JSON (recursively sorted keys) so the same result always hashes identically. */
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
}

/** keccak256 over the canonical JSON of a result — the on-chain provenance commitment. */
export function hashResult(result: unknown): Hex {
  return keccak256(stringToHex(canonical(result)));
}

export interface IdentityView {
  agentId: string;
  owner: Address;
  agentUri: string;
}

export interface ProvenanceSummary {
  count: number;
  client: Address;
}

/** Read-only ERC-8004 view (no key needed) — for the /api/agent route + UI identity panel. */
export function createErc8004Reader(config: AppConfig) {
  const client = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(config.mantleSepoliaRpc),
  });
  const observed = () => new Date().toISOString();

  return {
    async readIdentity(agentId: string): Promise<Sourced<IdentityView>> {
      const id = BigInt(agentId);
      const [owner, agentUri] = await Promise.all([
        client.readContract({ address: REG.identity, abi: IDENTITY_ABI, functionName: "ownerOf", args: [id] }),
        client
          .readContract({ address: REG.identity, abi: IDENTITY_ABI, functionName: "tokenURI", args: [id] })
          .catch(() => ""),
      ]);
      return sourced(
        { agentId, owner: getAddress(owner as Address), agentUri: agentUri as string },
        {
          sourceName: "ERC-8004 Identity Registry (Mantle Sepolia eth_call)",
          url: addrUrl(REG.identity),
          observedAt: observed(),
          kind: "fact",
          note: `ownerOf/tokenURI(${agentId}) on ${REG.identity}`,
        },
      );
    },

    /** Count of provenance receipts written by `client` about this agent. */
    async readProvenanceSummary(agentId: string, clientAddr: Address): Promise<Sourced<ProvenanceSummary>> {
      const res = (await client.readContract({
        address: REG.reputation,
        abi: REPUTATION_ABI,
        functionName: "getSummary",
        args: [BigInt(agentId), [getAddress(clientAddr)], PROVENANCE_TAG1, ""],
      })) as readonly [bigint, bigint, number];
      return sourced(
        { count: Number(res[0]), client: getAddress(clientAddr) },
        {
          sourceName: "ERC-8004 Reputation Registry (Mantle Sepolia eth_call)",
          url: addrUrl(REG.reputation),
          observedAt: observed(),
          kind: "fact",
          note: `getSummary(${agentId}, [self], tag1="${PROVENANCE_TAG1}") on ${REG.reputation}`,
        },
      );
    },
  };
}

export interface RegisterResult {
  agentId: string;
  txHash: Hex;
  receipt: SourceReceipt;
}

export interface AttestInput {
  agentId: string;
  symbol: string;
  /** keccak256 of the canonical result — the commitment. */
  resultHash: Hex;
  /** Where the full result can be fetched (https/data URI). */
  resultUri: string;
  endpoint: string;
}

export interface AttestResult {
  txHash: Hex;
  resultHash: Hex;
  agentId: string;
  receipt: SourceReceipt;
}

/**
 * Write-capable ERC-8004 client (requires the Sepolia agent key). Every write is SIMULATED first
 * (`simulateContract`) — a successful simulation against the deployed bytecode confirms the selector
 * and args before we spend gas (the on-chain leg of the D6 gate).
 */
export function createErc8004Writer(config: AppConfig) {
  if (!config.agentPrivateKey) {
    throw new Error("AGENT_PRIVATE_KEY required for ERC-8004 writes (testnet-only key).");
  }
  const w = walletClientForSepolia(config.agentPrivateKey, config.mantleSepoliaRpc);
  const observed = () => new Date().toISOString();

  return {
    address: w.account.address as Address,

    async balanceWei(): Promise<bigint> {
      return w.public.getBalance({ address: w.account.address });
    },

    /** Register the agent identity (mints the ERC-721) with `agentUri`. Returns the new agentId. */
    async registerIdentity(agentUri: string): Promise<RegisterResult> {
      const { request, result } = await w.public.simulateContract({
        account: w.account,
        address: REG.identity,
        abi: IDENTITY_ABI,
        functionName: "register",
        args: [agentUri],
      });
      const txHash = await w.wallet.writeContract(request);
      await w.public.waitForTransactionReceipt({ hash: txHash });
      const agentId = (result as bigint).toString();
      return {
        agentId,
        txHash,
        receipt: {
          sourceName: "ERC-8004 Identity Registry (Mantle Sepolia tx)",
          url: txUrl(txHash),
          observedAt: observed(),
          kind: "fact",
          note: `register("${agentUri}") → agentId ${agentId}`,
        },
      };
    },

    async setAgentUri(agentId: string, uri: string): Promise<Hex> {
      const { request } = await w.public.simulateContract({
        account: w.account,
        address: REG.identity,
        abi: IDENTITY_ABI,
        functionName: "setAgentURI",
        args: [BigInt(agentId), uri],
      });
      const hash = await w.wallet.writeContract(request);
      await w.public.waitForTransactionReceipt({ hash });
      return hash;
    },

    /**
     * Write a provenance receipt: a Reputation feedback entry whose `feedbackHash` commits to the
     * exact result. value=0 (neutral — this is provenance of work done, NOT a rating), tags carry
     * the asset, feedbackURI points to the result.
     */
    async writeProvenanceReceipt(input: AttestInput): Promise<AttestResult> {
      const { request } = await w.public.simulateContract({
        account: w.account,
        address: REG.reputation,
        abi: REPUTATION_ABI,
        functionName: "giveFeedback",
        args: [
          BigInt(input.agentId),
          0n, // neutral value — provenance, not a score
          0, // valueDecimals
          PROVENANCE_TAG1,
          input.symbol,
          input.endpoint,
          input.resultUri,
          input.resultHash,
        ],
      });
      const txHash = await w.wallet.writeContract(request);
      await w.public.waitForTransactionReceipt({ hash: txHash });
      return {
        txHash,
        resultHash: input.resultHash,
        agentId: input.agentId,
        receipt: {
          sourceName: "ERC-8004 Reputation Registry (Mantle Sepolia tx)",
          url: txUrl(txHash),
          observedAt: observed(),
          kind: "fact",
          note: `giveFeedback(agentId=${input.agentId}, tag2=${input.symbol}) feedbackHash=result commitment`,
        },
      };
    },
  };
}

export type Erc8004Writer = ReturnType<typeof createErc8004Writer>;
export type Erc8004Reader = ReturnType<typeof createErc8004Reader>;
