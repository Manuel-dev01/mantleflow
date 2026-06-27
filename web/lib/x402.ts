"use client";

import type { DistributionMap } from "@mantleflow/agent";
import { connectSepolia } from "./wallet";

interface Eip1193 {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
}
function eth(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export interface DeepDiveResult {
  answer?: string;
  map?: DistributionMap;
  settlement?: { txHash: string; explorerUrl: string; via: string; amount: string };
  error?: string;
  /** false when the deployment runs x402-disabled (the query was free). */
  paid?: boolean;
}

export type DeepDiveStep = "idle" | "requesting" | "connecting" | "funding" | "signing" | "settling";

function randomNonce(): `0x${string}` {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return ("0x" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

async function signTransferAuthorization(
  accept: { asset: string; payTo: string; network: string; extra: { name: string; version: string } },
  auth: { from: string; to: string; value: string; validAfter: string; validBefore: string; nonce: string },
): Promise<string> {
  const provider = eth();
  if (!provider) throw new Error("No wallet found.");
  const chainId = Number(accept.network.split(":")[1]);
  const typedData = {
    domain: { name: accept.extra.name, version: accept.extra.version, chainId, verifyingContract: accept.asset },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: auth,
  };
  return (await provider.request({ method: "eth_signTypedData_v4", params: [auth.from, JSON.stringify(typedData)] })) as string;
}

/**
 * x402 deep-dive: POST the query; if 402, connect wallet → faucet (gasless) → sign EIP-3009 → resend
 * with X-PAYMENT → 200. Returns the LLM answer + map + the on-chain settlement. If x402 is disabled
 * on the deployment, the first POST returns 200 and we're done (paid=false).
 */
export async function payAndRunQuery(query: string, onStep?: (s: DeepDiveStep) => void): Promise<DeepDiveResult> {
  onStep?.("requesting");
  let res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (res.status !== 402) {
    const data = (await res.json()) as DeepDiveResult;
    return { ...data, paid: false };
  }

  const challenge = (await res.json()) as { x402Version?: number; accepts?: Array<Record<string, unknown>> };
  const accept = challenge.accepts?.[0] as
    | { asset: string; payTo: string; network: string; maxAmountRequired: string; maxTimeoutSeconds?: number; extra: { name: string; version: string } }
    | undefined;
  if (!accept) return { error: "Malformed 402 challenge." };

  onStep?.("connecting");
  const from = await connectSepolia();

  onStep?.("funding");
  await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: from }) }).catch(() => {});

  onStep?.("signing");
  const authorization = {
    from,
    to: accept.payTo,
    value: accept.maxAmountRequired,
    validAfter: "0",
    validBefore: String(Math.floor(Date.now() / 1000) + (accept.maxTimeoutSeconds ?? 300)),
    nonce: randomNonce(),
  };
  const signature = await signTransferAuthorization(accept, authorization);
  const payment = { x402Version: challenge.x402Version ?? 1, scheme: "exact", network: accept.network, payload: { signature, authorization } };
  const xPayment = btoa(JSON.stringify(payment));

  onStep?.("settling");
  res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json", "X-PAYMENT": xPayment },
    body: JSON.stringify({ query }),
  });
  const data = (await res.json()) as DeepDiveResult;
  return { ...data, paid: true };
}
