import type { DistributionMap, SourceReceipt } from "@mantleflow/agent";

export interface QueryResponse {
  answer?: string;
  map?: DistributionMap;
  toolCalls?: { name: string }[];
  error?: string;
}

/** Full NL query → LLM answer + structured map (runs the orchestrator). Basic (deep=false) is FREE;
 * deep=true is the x402 premium (use payAndRunQuery for that). */
export async function runQuery(query: string, deep = false): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, deep }),
  });
  return (await res.json()) as QueryResponse;
}

export type Network = "mainnet" | "sepolia";

/** Distribution map for a curated symbol OR an arbitrary token address — no LLM, fast. */
export async function getMap(input: string, network: Network = "mainnet"): Promise<{ map?: DistributionMap; error?: string }> {
  const res = await fetch(`/api/map?symbol=${encodeURIComponent(input)}&network=${network}`);
  return (await res.json()) as { map?: DistributionMap; error?: string };
}

export interface FeaturedAsset {
  symbol: string;
  name: string;
  network: Network;
  curated: boolean;
}

export interface ResolveResult {
  resolved: boolean;
  symbol?: string;
  name?: string;
  address?: string;
  network?: Network;
  curated?: boolean;
  issuer?: string | null;
  featured?: FeaturedAsset[];
  error?: string;
}

/** Resolve a symbol / name / 0x address → an asset descriptor (for the "analyze any asset" input). */
export async function resolveAsset(q: string, network: Network = "mainnet"): Promise<ResolveResult> {
  const res = await fetch(`/api/resolve?q=${encodeURIComponent(q)}&network=${network}`);
  return (await res.json()) as ResolveResult;
}

/** The curated featured assets (single source of truth for the chips). */
export async function getFeatured(): Promise<{ featured?: FeaturedAsset[]; error?: string }> {
  const res = await fetch("/api/featured");
  return (await res.json()) as { featured?: FeaturedAsset[]; error?: string };
}

// ---- ERC-8004 agent identity + provenance ----------------------------------

export interface AgentInfo {
  registered: boolean;
  registry: {
    chain: string;
    network: string;
    identity: string;
    reputation: string;
    explorer: string;
    agentCardUrl: string;
  };
  identity?: { value: { agentId: string; owner: string; agentUri: string }; receipt: SourceReceipt };
  reputation?: {
    value: { count: number; raters: string[]; avgScore: number | null; windowBounded: boolean };
    receipt: SourceReceipt;
  } | null;
  error?: string;
}

export async function getAgent(): Promise<AgentInfo> {
  const res = await fetch("/api/agent", { cache: "no-store" });
  return (await res.json()) as AgentInfo;
}

export interface AttestResponse {
  txHash?: string;
  resultHash?: string;
  agentId?: string;
  blockNumber?: string | null;
  verified?: boolean;
  explorerUrl?: string;
  receipt?: SourceReceipt;
  error?: string;
}

export interface VerifyResponse {
  value?: { verified: boolean; blockNumber: string | null; txHash: string };
  receipt?: SourceReceipt;
  error?: string;
}

/** Independently re-verify an attestation on-chain (re-reads the tx receipt). */
export async function verifyAttestation(tx: string, hash: string): Promise<VerifyResponse> {
  const res = await fetch(`/api/verify?tx=${encodeURIComponent(tx)}&hash=${encodeURIComponent(hash)}`, {
    cache: "no-store",
  });
  return (await res.json()) as VerifyResponse;
}

/** Write an on-chain provenance receipt for a result. `ok=false` (e.g. 501) → honestly unconfigured. */
export async function attest(map: DistributionMap): Promise<{ ok: boolean; status: number; data: AttestResponse }> {
  const res = await fetch("/api/attest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ map }),
  });
  return { ok: res.ok, status: res.status, data: (await res.json()) as AttestResponse };
}
