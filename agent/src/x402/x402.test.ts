import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { type Address } from "viem";
import { AppConfigSchema, type AppConfig } from "../config/env.js";
import { X402_NETWORKS, X402_ASSET_DOMAIN } from "./challenge.js";
import { verifyPayment } from "./settle.js";
import { type PaymentPayload } from "./types.js";

const buyer = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const ASSET = "0x246e485a5966b19871f3e9297182f8cb49fd8242" as Address;
const PAY_TO = "0x8974881E39a5eF62214929B6CaA6EC0C6e7D47c7" as Address;

const cfg: AppConfig = AppConfigSchema.parse({
  x402Enabled: true,
  x402Network: "sepolia",
  x402Asset: ASSET,
  x402PayTo: PAY_TO,
  x402PriceAtomic: "10000",
});

const TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

async function makePayment(over: Partial<{ to: Address; value: string; validBefore: string }> = {}): Promise<string> {
  const auth = {
    from: buyer.address,
    to: over.to ?? PAY_TO,
    value: over.value ?? "10000",
    validAfter: "0",
    validBefore: over.validBefore ?? String(Math.floor(Date.now() / 1000) + 600),
    nonce: ("0x" + "11".repeat(32)) as `0x${string}`,
  };
  const signature = await buyer.signTypedData({
    domain: { ...X402_ASSET_DOMAIN.sepolia, chainId: X402_NETWORKS.sepolia.chainId, verifyingContract: ASSET },
    types: TYPES,
    primaryType: "TransferWithAuthorization",
    message: { ...auth, value: BigInt(auth.value), validAfter: 0n, validBefore: BigInt(auth.validBefore) },
  });
  const payload: PaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: X402_NETWORKS.sepolia.caip2,
    payload: { signature, authorization: auth },
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

describe("x402 verifyPayment", () => {
  it("accepts a valid signed authorization", async () => {
    const p = await verifyPayment(cfg, await makePayment());
    expect(p.payload.authorization.from.toLowerCase()).toBe(buyer.address.toLowerCase());
  });

  it("rejects wrong payTo", async () => {
    await expect(verifyPayment(cfg, await makePayment({ to: "0x000000000000000000000000000000000000dEaD" }))).rejects.toThrow(/payTo|signature/);
  });

  it("rejects amount below price", async () => {
    await expect(verifyPayment(cfg, await makePayment({ value: "1" }))).rejects.toThrow(/below price|signature/);
  });

  it("rejects an expired authorization", async () => {
    await expect(verifyPayment(cfg, await makePayment({ validBefore: "1" }))).rejects.toThrow(/expired|signature/);
  });

  it("rejects a tampered signature (re-signed field mismatch)", async () => {
    // build a valid b64 then flip the value in the decoded JSON so the signature no longer matches
    const b64 = await makePayment();
    const obj = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    obj.payload.authorization.value = "999999999";
    const tampered = Buffer.from(JSON.stringify(obj)).toString("base64");
    await expect(verifyPayment(cfg, tampered)).rejects.toThrow(/signature/);
  });
});
