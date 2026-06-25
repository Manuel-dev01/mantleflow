import {
  type Address,
  type PublicClient,
  getAddress,
  hexToBigInt,
  isAddress,
  slice,
} from "viem";

/** EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1. */
const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

/** Returns true if there is contract bytecode at `address`. */
export async function hasCode(
  client: PublicClient,
  address: Address,
): Promise<boolean> {
  const code = await client.getCode({ address });
  return !!code && code !== "0x";
}

/**
 * Resolve a proxy's implementation address via the EIP-1967 slot. Returns null if the slot is
 * empty (not an EIP-1967 proxy — could be a transparent/custom proxy, resolve via Etherscan instead).
 */
export async function resolveEip1967Implementation(
  client: PublicClient,
  proxy: Address,
): Promise<Address | null> {
  const raw = await client.getStorageAt({ address: proxy, slot: EIP1967_IMPL_SLOT });
  if (!raw || raw === "0x" || hexToBigInt(raw) === 0n) return null;
  // The address occupies the low 20 bytes of the 32-byte slot.
  const addr = getAddress(slice(raw, 12));
  return addr;
}

/** Lightweight presence test: does an eth_call to `selector` revert? Used for ABI probing. */
export async function selectorResponds(
  client: PublicClient,
  address: Address,
  selector: `0x${string}`,
): Promise<boolean> {
  try {
    await client.call({ to: address, data: selector });
    return true;
  } catch {
    return false;
  }
}

export function assertAddress(value: string): Address {
  if (!isAddress(value)) throw new Error(`Not an address: ${value}`);
  return getAddress(value);
}
