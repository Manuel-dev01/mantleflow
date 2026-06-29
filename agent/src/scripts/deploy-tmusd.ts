/**
 * Deploy the TestUSD (tmUSD) EIP-3009 token to Mantle Sepolia via viem (forge's HTTP client can't
 * reach the RPC from this host; Node fetch can). Uses forge's compiled artifact.
 * Run: pnpm -C agent exec tsx src/scripts/deploy-tmusd.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type Abi, type Hex } from "viem";
import { loadConfig } from "../config/env.js";
import { walletClientForSepolia } from "../config/chains.js";

async function main() {
  const cfg = loadConfig(process.env as Record<string, string | undefined>);
  if (!cfg.agentPrivateKey) throw new Error("AGENT_PRIVATE_KEY required");

  const artifactPath = resolve(process.cwd(), "../contracts/out/TestUSD.sol/TestUSD.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    abi: Abi;
    bytecode: { object: Hex };
  };

  const w = walletClientForSepolia(cfg.agentPrivateKey, cfg.mantleSepoliaRpc);
  console.log("deployer:", w.account.address);
  const bal = await w.public.getBalance({ address: w.account.address });
  console.log("balance:", Number(bal) / 1e18, "MNT");

  const hash = await w.wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    account: w.account,
    chain: w.wallet.chain,
  });
  console.log("deploy tx:", hash);
  const receipt = await w.public.waitForTransactionReceipt({ hash });
  console.log("\n✓ tmUSD deployed at:", receipt.contractAddress);
  console.log("  block:", receipt.blockNumber.toString());
  console.log("  explorer:", `https://explorer.sepolia.mantle.xyz/address/${receipt.contractAddress}`);
  console.log("\nNEXT: set X402_ASSET=" + receipt.contractAddress + " in env + Vercel.");
}

main().catch((e) => {
  console.error("deploy failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
