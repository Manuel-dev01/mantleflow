/**
 * x402 "exact" scheme types (github.com/coinbase/x402). The seller answers a gated request with a
 * 402 + `X402Challenge`; the buyer re-sends with an `X-PAYMENT` header carrying a base64 `PaymentPayload`
 * (a signed EIP-3009 `transferWithAuthorization`); the seller verifies + settles on-chain.
 */

export interface X402Accept {
  scheme: "exact";
  /** CAIP-2 network id, e.g. eip155:5003 (Mantle Sepolia) / eip155:5000 (Mantle mainnet). */
  network: string;
  /** EIP-3009 settlement token address. */
  asset: string;
  /** Required amount in the token's smallest unit (string). */
  maxAmountRequired: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  /** Asset EIP-712 domain pieces the buyer needs to sign. */
  extra: { name: string; version: string };
}

export interface X402Challenge {
  x402Version: number;
  accepts: X402Accept[];
}

export interface Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: { signature: string; authorization: Authorization };
}

export interface Settlement {
  txHash: string;
  payer: string;
  asset: string;
  amount: string;
  network: string;
  explorerUrl: string;
  via: "self-settle" | "questflow";
}
