/**
 * Live end-to-end x402 self-settle smoke on Mantle Sepolia against the deployed tmUSD:
 * mint → buyer signs EIP-3009 → verifyAndSettle (real transferWithAuthorization) → balances move.
 * Run: pnpm -C agent exec tsx src/scripts/x402-smoke.ts
 */
import "dotenv/config";
import { createPublicClient, http, getAddress, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mantleSepoliaTestnet } from "viem/chains";
import { loadConfig } from "../config/env.js";
import { walletClientForSepolia } from "../config/chains.js";
import { X402_NETWORKS, X402_ASSET_DOMAIN } from "../x402/challenge.js";
import { verifyAndSettle } from "../x402/settle.js";

const TOKEN_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const TYPES = { TransferWithAuthorization: [
  { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
  { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
] } as const;

async function main() {
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  const asset = getAddress(cfg.x402Asset as Address);
  const payTo = getAddress(cfg.x402PayTo as Address);
  const pub = createPublicClient({ chain: mantleSepoliaTestnet, transport: http(cfg.mantleSepoliaRpc) });
  const server = walletClientForSepolia(cfg.agentPrivateKey!, cfg.mantleSepoliaRpc);

  const buyer = privateKeyToAccount(generatePrivateKey());
  console.log("buyer:", buyer.address);

  // 1) server mints tmUSD to the buyer (buyer needs no gas / no real money)
  const mintHash = await server.wallet.writeContract({ account: server.account, chain: mantleSepoliaTestnet, address: asset, abi: TOKEN_ABI, functionName: "mint", args: [buyer.address, 1_000_000n] });
  await pub.waitForTransactionReceipt({ hash: mintHash });
  console.log("minted 1.0 tmUSD to buyer");

  const payToBefore = (await pub.readContract({ address: asset, abi: TOKEN_ABI, functionName: "balanceOf", args: [payTo] })) as bigint;

  // 2) buyer signs the EIP-3009 authorization (gasless)
  const auth = {
    from: buyer.address, to: payTo, value: cfg.x402PriceAtomic, validAfter: "0",
    validBefore: String(Math.floor(Date.now() / 1000) + 600), nonce: ("0x" + "22".repeat(32)) as Hex,
  };
  const signature = await buyer.signTypedData({
    domain: { ...X402_ASSET_DOMAIN.sepolia, chainId: X402_NETWORKS.sepolia.chainId, verifyingContract: asset },
    types: TYPES, primaryType: "TransferWithAuthorization",
    message: { ...auth, value: BigInt(auth.value), validAfter: 0n, validBefore: BigInt(auth.validBefore) },
  });
  const xPayment = Buffer.from(JSON.stringify({ x402Version: 1, scheme: "exact", network: X402_NETWORKS.sepolia.caip2, payload: { signature, authorization: auth } })).toString("base64");

  // 3) server verifies + self-settles
  const settlement = await verifyAndSettle(cfg, xPayment, "https://mantleflow.vercel.app/api/query");
  console.log("\n✓ settled:", settlement.txHash, "via", settlement.via);
  console.log("  explorer:", settlement.explorerUrl);

  const payToAfter = (await pub.readContract({ address: asset, abi: TOKEN_ABI, functionName: "balanceOf", args: [payTo] })) as bigint;
  console.log("payTo balance +", (payToAfter - payToBefore).toString(), "atomic (expected", cfg.x402PriceAtomic + ")");

  // 4) replay must fail
  try {
    await verifyAndSettle(cfg, xPayment, "https://mantleflow.vercel.app/api/query");
    console.log("✗ REPLAY SUCCEEDED — BUG");
  } catch (e) {
    console.log("✓ replay rejected:", ((e instanceof Error ? e.message : String(e)).split("\n")[0] ?? "").slice(0, 60));
  }
}

main().catch((e) => { console.error("x402-smoke failed:", e instanceof Error ? e.message : String(e)); process.exit(1); });
