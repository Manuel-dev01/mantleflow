import { type Address, type PublicClient, erc20Abi } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { type Sourced, onchainReceipt, sourced } from "../types/source-receipt.js";

export interface TokenFacts {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

/**
 * Read core ERC-20 facts directly from Mantle. Real on-chain reads only — each field is wrapped
 * in a SourceReceipt so the UI can show provenance. `observedAt` is injected by the caller so the
 * library stays deterministic/testable.
 */
export async function readTokenFacts(
  client: PublicClient,
  network: MantleNetwork,
  address: Address,
  observedAt: string,
): Promise<Sourced<TokenFacts>> {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "name" }),
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address, abi: erc20Abi, functionName: "totalSupply" }),
  ]);
  return sourced(
    { name, symbol, decimals, totalSupply },
    onchainReceipt({
      explorerBase: explorerBaseFor(network),
      address,
      call: "name()/symbol()/decimals()/totalSupply()",
      observedAt,
    }),
  );
}
