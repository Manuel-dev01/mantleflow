import {
  type Address,
  type Hex,
  keccak256,
  stringToHex,
  getAddress,
} from "viem";
import { type AppConfig } from "../config/env.js";
import { type MantleNetwork, walletClientFor, publicClientFor, explorerBaseFor } from "../config/chains.js";
import { ERC8004 } from "../config/addresses.js";
import { IDENTITY_ABI, REPUTATION_ABI, PROVENANCE_TAG1 } from "./abis.js";
import { type Sourced, type SourceReceipt, sourced } from "../types/source-receipt.js";

/** Resolve the network-specific ERC-8004 context (registries / RPC / explorer / label) from config.
 * Identity + provenance + reputation default to mainnet (config.erc8004Network); x402 is separate. */
function erc8004Ctx(config: AppConfig) {
  const network: MantleNetwork = config.erc8004Network;
  const reg = ERC8004[network];
  const rpc = network === "mainnet" ? config.mantleMainnetRpc : config.mantleSepoliaRpc;
  const explorer = explorerBaseFor(network);
  const netLabel = network === "mainnet" ? "Mantle" : "Mantle Sepolia";
  return { network, reg, rpc, explorer, netLabel };
}

// Deployed Identity registry's MetadataSet event signature (topic0) — captured live from the
// register/attest tx logs on Mantle. Topics: [sig, indexed agentId,
// indexed keccak256(metadataKey)]. Event-signature topic0 is identical across the same impl.
const METADATA_SET_TOPIC = "0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b";

// Deployed Reputation registry's feedback event signature (topic0) — captured live on Mantle.
// Topics: [sig, indexed agentId, indexed client(rater), indexed tagHash].
const FEEDBACK_TOPIC = "0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc";

// Mantle RPC caps eth_getLogs at ~10k blocks; chunk under that and scan a recent window.
const LOG_CHUNK = 9000n;
const LOG_CHUNKS = 6; // recent ~54k-block window (documented bound — we don't scan full history).

function txUrl(explorer: string, hash: Hex): string {
  return `${explorer}/tx/${hash}`;
}
function addrUrl(explorer: string, addr: string): string {
  return `${explorer}/address/${addr}`;
}

/** agentId → its 32-byte indexed-topic encoding. */
function agentTopic(agentId: string): string {
  return `0x${BigInt(agentId).toString(16).padStart(64, "0")}`;
}

/** A log shape — only the fields we inspect (works for viem receipt logs and raw RPC logs). */
export interface LogLike {
  address?: string | null;
  topics?: readonly (string | null)[];
}

/**
 * Pure check: does this log prove agent `agentId` committed to `resultHash`? True iff it is a
 * MetadataSet event from the Identity registry with topic1 = agentId and topic2 = keccak256(key).
 * This is the reliable, RPC-range-independent provenance verification (decoded from a tx receipt).
 */
export function metadataLogMatches(
  log: LogLike,
  agentId: string,
  resultHash: Hex,
  identityRegistry: string,
): boolean {
  const t = log.topics ?? [];
  return (
    (log.address ?? "").toLowerCase() === identityRegistry.toLowerCase() &&
    (t[0] ?? "").toLowerCase() === METADATA_SET_TOPIC &&
    (t[1] ?? "").toLowerCase() === agentTopic(agentId).toLowerCase() &&
    (t[2] ?? "").toLowerCase() === keccak256(stringToHex(resultHash)).toLowerCase()
  );
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

export interface ReputationView {
  /** Number of third-party feedback entries found in the scanned window. */
  count: number;
  /** Distinct rater (client) addresses. */
  raters: Address[];
  /** Aggregate score from getSummary over those raters, normalised by valueDecimals (null if none). */
  avgScore: number | null;
  /** Whether the scan window may have missed older entries (RPC range bound). */
  windowBounded: boolean;
}

/** topic2 (32-byte) → checksummed address (last 20 bytes). */
function topicToAddress(topic: string): Address {
  return getAddress(`0x${topic.slice(-40)}`);
}

/** Read-only ERC-8004 view (no key needed) — for the /api/agent route + UI identity panel. */
export function createErc8004Reader(config: AppConfig) {
  const { reg: REG, rpc, explorer, netLabel, network } = erc8004Ctx(config);
  const client = publicClientFor(network, rpc);
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
          sourceName: `ERC-8004 Identity Registry (${netLabel} eth_call)`,
          url: addrUrl(explorer, REG.identity),
          observedAt: observed(),
          kind: "fact",
          note: `ownerOf/tokenURI(${agentId}) on ${REG.identity}`,
        },
      );
    },

    /**
     * Independently verify a provenance attestation: re-fetch the tx receipt and confirm it contains
     * a MetadataSet event committing `resultHash` for `agentId`. Reliable + unbounded (one receipt
     * read) — anyone with the tx hash can run this.
     */
    async verifyAttestation(
      txHash: Hex,
      agentId: string,
      resultHash: Hex,
    ): Promise<Sourced<{ verified: boolean; blockNumber: string | null; txHash: Hex }>> {
      let verified = false;
      let blockNumber: string | null = null;
      try {
        const receipt = await client.getTransactionReceipt({ hash: txHash });
        blockNumber = receipt.blockNumber.toString();
        verified = receipt.logs.some((l) => metadataLogMatches(l, agentId, resultHash, REG.identity));
      } catch {
        /* unknown tx / RPC issue → not verified */
      }
      return sourced(
        { verified, blockNumber, txHash },
        {
          sourceName: `ERC-8004 Identity Registry · MetadataSet receipt (${netLabel})`,
          url: txUrl(explorer, txHash),
          observedAt: observed(),
          kind: "fact",
          note: `getTransactionReceipt(${txHash}); match agentId=${agentId} + keccak256(resultHash)`,
        },
      );
    },

    /**
     * Read GENUINE third-party reputation: scan recent Feedback events for this agent (chunked under
     * the RPC's 10k-block log cap), collect distinct raters, then `getSummary` over them for the
     * aggregate score. Self-feedback is impossible (the contract forbids it), so any count here is
     * from independent addresses.
     */
    async readReputation(agentId: string): Promise<Sourced<ReputationView>> {
      const at = agentTopic(agentId);
      const raters = new Set<string>();
      let latest = 0n;
      try {
        latest = await client.getBlockNumber();
        for (let i = 0; i < LOG_CHUNKS; i++) {
          const to = latest - BigInt(i) * LOG_CHUNK;
          if (to < 0n) break;
          const from = to > LOG_CHUNK ? to - LOG_CHUNK + 1n : 0n;
          const logs = (await client.request({
            method: "eth_getLogs",
            params: [{ address: REG.reputation, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}`, topics: [FEEDBACK_TOPIC, at] }],
          } as never)) as Array<{ topics: string[] }>;
          for (const l of logs) if (l.topics[2]) raters.add(topicToAddress(l.topics[2]));
          if (from === 0n) break;
        }
      } catch {
        /* scan failed — report what we have */
      }

      const raterList = [...raters].map((r) => r as Address);
      let count = raterList.length;
      let avgScore: number | null = null;
      if (raterList.length > 0) {
        try {
          const sum = (await client.readContract({
            address: REG.reputation,
            abi: REPUTATION_ABI,
            functionName: "getSummary",
            args: [BigInt(agentId), raterList, "", ""],
          })) as readonly [bigint, bigint, number];
          count = Number(sum[0]);
          avgScore = Number(sum[1]) / 10 ** Number(sum[2] || 0);
        } catch {
          /* keep the log-derived count */
        }
      }

      return sourced(
        { count, raters: raterList, avgScore, windowBounded: true },
        {
          sourceName: `ERC-8004 Reputation Registry · Feedback events + getSummary (${netLabel})`,
          url: addrUrl(explorer, REG.reputation),
          observedAt: observed(),
          kind: "fact",
          note: `Feedback logs (last ~${LOG_CHUNKS * Number(LOG_CHUNK)} blocks) + getSummary for agentId ${agentId}`,
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
  blockNumber: string | null;
  /** Independently confirmed from the tx receipt's MetadataSet event (not just tx success). */
  verified: boolean;
  receipt: SourceReceipt;
}

/**
 * Write-capable ERC-8004 client (requires the Sepolia agent key). Every write is SIMULATED first
 * (`simulateContract`) — a successful simulation against the deployed bytecode confirms the selector
 * and args before we spend gas (the on-chain leg of the D6 gate).
 */
export function createErc8004Writer(config: AppConfig) {
  if (!config.agentPrivateKey) {
    throw new Error("AGENT_PRIVATE_KEY required for ERC-8004 writes.");
  }
  const { reg: REG, rpc, explorer, netLabel, network } = erc8004Ctx(config);
  const w = walletClientFor(network, config.agentPrivateKey, rpc);
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
          sourceName: `ERC-8004 Identity Registry (${netLabel} tx)`,
          url: txUrl(explorer, txHash),
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
     * Write a provenance receipt: stamp the result's hash into the agent's OWN identity metadata
     * (`setMetadata`, key = resultHash). Content-addressed, owner-authorized, tamper-evident — NOT a
     * reputation score (the Reputation registry forbids self-feedback by design). Anyone can later
     * `getMetadata(agentId, resultHash)` and confirm the agent committed to exactly this result.
     */
    async writeProvenanceReceipt(input: AttestInput): Promise<AttestResult> {
      const detail = JSON.stringify({
        tag: PROVENANCE_TAG1,
        symbol: input.symbol,
        uri: input.resultUri,
        endpoint: input.endpoint,
        at: observed(),
      });
      const { request } = await w.public.simulateContract({
        account: w.account,
        address: REG.identity,
        abi: IDENTITY_ABI,
        functionName: "setMetadata",
        args: [BigInt(input.agentId), input.resultHash, stringToHex(detail)],
      });
      const txHash = await w.wallet.writeContract(request);
      const receipt = await w.public.waitForTransactionReceipt({ hash: txHash });
      // Confirm the commitment landed in the canonical event, not merely that the tx succeeded.
      const verified = receipt.logs.some((l) => metadataLogMatches(l, input.agentId, input.resultHash, REG.identity));
      return {
        txHash,
        resultHash: input.resultHash,
        agentId: input.agentId,
        blockNumber: receipt.blockNumber.toString(),
        verified,
        receipt: {
          sourceName: `ERC-8004 Identity Registry · metadata (${netLabel} tx)`,
          url: txUrl(explorer, txHash),
          observedAt: observed(),
          kind: "fact",
          note: `setMetadata(agentId=${input.agentId}, key=resultHash) → ${input.symbol} result commitment`,
        },
      };
    },
  };
}

export type Erc8004Writer = ReturnType<typeof createErc8004Writer>;
export type Erc8004Reader = ReturnType<typeof createErc8004Reader>;
