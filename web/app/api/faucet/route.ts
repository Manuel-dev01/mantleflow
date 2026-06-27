import { NextResponse } from "next/server";
import { getAddress, isAddress, type Address } from "viem";
import { loadConfig, walletClientForSepolia, x402Active } from "@mantleflow/agent";
import { mantleSepoliaTestnet } from "viem/chains";

// Server-funded faucet: mints test tmUSD to the buyer so they need zero MNT and zero real money to
// try the x402 paid query. Testnet only. The server (agent wallet) pays gas.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TOKEN_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const FAUCET_AMOUNT = 1_000_000n; // 1.0 tmUSD (6 decimals) — plenty for many 0.01 queries

function jsonSafe(data: unknown, status = 200): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  return new NextResponse(body, { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  let to: unknown;
  try {
    ({ to } = (await req.json()) as { to?: unknown });
  } catch {
    return jsonSafe({ error: "Invalid JSON body" }, 400);
  }
  if (typeof to !== "string" || !isAddress(to)) return jsonSafe({ error: "valid `to` address required" }, 400);

  const config = loadConfig(process.env as Record<string, string | undefined>);
  if (!x402Active(config) || !config.agentPrivateKey) {
    return jsonSafe({ error: "Faucet unavailable — x402 not configured on this deployment." }, 501);
  }

  try {
    const w = walletClientForSepolia(config.agentPrivateKey, config.mantleSepoliaRpc);
    const hash = await w.wallet.writeContract({
      account: w.account,
      chain: mantleSepoliaTestnet,
      address: getAddress(config.x402Asset as Address),
      abi: TOKEN_ABI,
      functionName: "mint",
      args: [getAddress(to as Address), FAUCET_AMOUNT],
    });
    await w.public.waitForTransactionReceipt({ hash });
    return jsonSafe({ txHash: hash, amount: FAUCET_AMOUNT.toString(), to });
  } catch (err) {
    return jsonSafe({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
