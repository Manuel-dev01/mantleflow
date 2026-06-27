import { type Address, type Hex, getAddress, recoverTypedDataAddress } from "viem";
import { type AppConfig } from "../config/env.js";
import { walletClientForSepolia, EXPLORER_SEPOLIA } from "../config/chains.js";
import { X402_NETWORKS, X402_ASSET_DOMAIN } from "./challenge.js";
import { type PaymentPayload, type Settlement } from "./types.js";

const TRANSFER_WITH_AUTH_ABI = [
  {
    type: "function",
    name: "transferWithAuthorization",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function decodePayment(xPaymentB64: string): PaymentPayload {
  const json = Buffer.from(xPaymentB64, "base64").toString("utf8");
  return JSON.parse(json) as PaymentPayload;
}

/**
 * Pure verification (no network): decode the X-PAYMENT, recover the EIP-712 signer, and enforce the
 * policy (signer==from, to==payTo, amount>=price, not expired). Returns the validated payment. Throws
 * on any mismatch. Tested in isolation.
 */
export async function verifyPayment(config: AppConfig, xPaymentB64: string): Promise<PaymentPayload> {
  const net = X402_NETWORKS[config.x402Network];
  const domain = X402_ASSET_DOMAIN[config.x402Network];
  const asset = getAddress(config.x402Asset as Address);
  const payTo = getAddress(config.x402PayTo as Address);
  const price = BigInt(config.x402PriceAtomic);

  const payment = decodePayment(xPaymentB64);
  if (payment.scheme !== "exact") throw new Error("x402: unsupported scheme");
  const a = payment.payload.authorization;

  const signer = await recoverTypedDataAddress({
    domain: { name: domain.name, version: domain.version, chainId: net.chainId, verifyingContract: asset },
    types: EIP3009_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: getAddress(a.from as Address),
      to: getAddress(a.to as Address),
      value: BigInt(a.value),
      validAfter: BigInt(a.validAfter),
      validBefore: BigInt(a.validBefore),
      nonce: a.nonce as Hex,
    },
    signature: payment.payload.signature as Hex,
  });
  if (getAddress(signer) !== getAddress(a.from as Address)) throw new Error("x402: signature does not match `from`");
  if (getAddress(a.to as Address) !== payTo) throw new Error("x402: wrong payTo");
  if (BigInt(a.value) < price) throw new Error("x402: amount below price");
  if (BigInt(a.validBefore) <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("x402: authorization expired");

  return payment;
}

/**
 * Verify the buyer's signed EIP-3009 authorization against the challenge, then settle on-chain.
 * Self-settles by default (the agent wallet submits `transferWithAuthorization`, paying gas); routes
 * through QuestFlow when its key is set.
 */
export async function verifyAndSettle(
  config: AppConfig,
  xPaymentB64: string,
  resource: string,
): Promise<Settlement> {
  const payment = await verifyPayment(config, xPaymentB64);
  const a = payment.payload.authorization;
  if (config.questflowApiKey) return settleViaQuestflow(config, payment, resource);
  return selfSettle(config, a.from, a.to, a.value, a.validAfter, a.validBefore, a.nonce as Hex, payment.payload.signature as Hex, getAddress(config.x402Asset as Address));
}

async function selfSettle(
  config: AppConfig,
  from: string,
  to: string,
  value: string,
  validAfter: string,
  validBefore: string,
  nonce: Hex,
  signature: Hex,
  asset: Address,
): Promise<Settlement> {
  if (config.x402Network !== "sepolia") {
    throw new Error("x402: self-settle is configured for Sepolia only; set QUESTFLOW_API_KEY for mainnet.");
  }
  const w = walletClientForSepolia(config.agentPrivateKey!, config.mantleSepoliaRpc);
  const { request } = await w.public.simulateContract({
    account: w.account,
    address: asset,
    abi: TRANSFER_WITH_AUTH_ABI,
    functionName: "transferWithAuthorization",
    args: [getAddress(from as Address), getAddress(to as Address), BigInt(value), BigInt(validAfter), BigInt(validBefore), nonce, signature],
  });
  const txHash = await w.wallet.writeContract(request);
  await w.public.waitForTransactionReceipt({ hash: txHash });
  return {
    txHash,
    payer: getAddress(from as Address),
    asset,
    amount: value,
    network: X402_NETWORKS.sepolia.caip2,
    explorerUrl: `${EXPLORER_SEPOLIA}/tx/${txHash}`,
    via: "self-settle",
  };
}

/** Pluggable QuestFlow facilitator (verify → settle). Used when QUESTFLOW_API_KEY is present. */
async function settleViaQuestflow(config: AppConfig, payment: PaymentPayload, resource: string): Promise<Settlement> {
  const headers = { "content-type": "application/json", authorization: `Bearer ${config.questflowApiKey}` };
  const verifyRes = await fetch(`${config.questflowFacilitatorUrl}/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({ x402Version: payment.x402Version, paymentPayload: payment, resource }),
  });
  if (!verifyRes.ok) throw new Error(`x402: facilitator verify failed (${verifyRes.status})`);
  const settleRes = await fetch(`${config.questflowFacilitatorUrl}/settle`, {
    method: "POST",
    headers,
    body: JSON.stringify({ x402Version: payment.x402Version, paymentPayload: payment, resource }),
  });
  if (!settleRes.ok) throw new Error(`x402: facilitator settle failed (${settleRes.status})`);
  const data = (await settleRes.json()) as { transaction?: string; txHash?: string; payer?: string };
  const txHash = data.transaction ?? data.txHash ?? "";
  return {
    txHash,
    payer: payment.payload.authorization.from,
    asset: config.x402Asset!,
    amount: payment.payload.authorization.value,
    network: payment.network,
    explorerUrl: txHash ? `${EXPLORER_SEPOLIA}/tx/${txHash}` : config.questflowFacilitatorUrl,
    via: "questflow",
  };
}
