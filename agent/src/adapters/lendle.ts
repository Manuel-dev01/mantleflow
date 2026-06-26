import { type Address, type PublicClient } from "viem";
import { type MantleNetwork, explorerBaseFor } from "../config/chains.js";
import { LENDLE } from "../config/addresses.js";
import { type Sourced, sourced } from "../types/source-receipt.js";

/**
 * Lendle (Aave-v2 fork) borrowability reader. The ProtocolDataProvider returns already-decoded
 * reserve config + state (no LTV bitmask juggling). Real on-chain reads; results carry a receipt.
 */
const PDP_ABI = [
  {
    type: "function",
    name: "getReserveConfigurationData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "decimals", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "liquidationBonus", type: "uint256" },
      { name: "reserveFactor", type: "uint256" },
      { name: "usageAsCollateralEnabled", type: "bool" },
      { name: "borrowingEnabled", type: "bool" },
      { name: "stableBorrowRateEnabled", type: "bool" },
      { name: "isActive", type: "bool" },
      { name: "isFrozen", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getReserveData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "availableLiquidity", type: "uint256" },
      { name: "totalStableDebt", type: "uint256" },
      { name: "totalVariableDebt", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "variableBorrowRate", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "averageStableBorrowRate", type: "uint256" },
      { name: "liquidityIndex", type: "uint256" },
      { name: "variableBorrowIndex", type: "uint256" },
      { name: "lastUpdateTimestamp", type: "uint40" },
    ],
  },
] as const;

export interface LendleReserve {
  listed: boolean;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  isFrozen: boolean;
  ltvPct: number;
  liquidationThresholdPct: number;
  supplyAprPct: number;
  variableBorrowAprPct: number;
  utilizationPct: number;
  availableLiquidity: bigint;
  totalDebt: bigint;
  reserveDecimals: number;
}

const RAY = 1e27; // Aave rates are per-annum, in ray.

/** Pure: turn raw ProtocolDataProvider tuples into a decoded reserve view. Unit-testable. */
export function decodeLendleReserve(
  cfg: readonly [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean, boolean, boolean],
  data: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, number],
): LendleReserve {
  const reserveDecimals = Number(cfg[0]);
  const isActive = cfg[8];
  const totalDebt = data[1] + data[2];
  const available = data[0];
  const denom = available + totalDebt;
  return {
    listed: isActive && reserveDecimals > 0,
    usageAsCollateralEnabled: cfg[5],
    borrowingEnabled: cfg[6],
    isFrozen: cfg[9],
    ltvPct: Number(cfg[1]) / 100, // basis points → %
    liquidationThresholdPct: Number(cfg[2]) / 100,
    supplyAprPct: (Number(data[3]) / RAY) * 100,
    variableBorrowAprPct: (Number(data[4]) / RAY) * 100,
    utilizationPct: denom > 0n ? (Number(totalDebt) / Number(denom)) * 100 : 0,
    availableLiquidity: available,
    totalDebt,
    reserveDecimals,
  };
}

export interface LendleAdapter {
  readReserve(
    client: PublicClient,
    network: MantleNetwork,
    asset: Address,
    observedAt: string,
  ): Promise<Sourced<LendleReserve>>;
}

export function createLendleAdapter(): LendleAdapter {
  return {
    async readReserve(client, network, asset, observedAt) {
      const [cfg, data] = await Promise.all([
        client.readContract({
          address: LENDLE.protocolDataProvider,
          abi: PDP_ABI,
          functionName: "getReserveConfigurationData",
          args: [asset],
        }),
        client.readContract({
          address: LENDLE.protocolDataProvider,
          abi: PDP_ABI,
          functionName: "getReserveData",
          args: [asset],
        }),
      ]);
      const reserve = decodeLendleReserve(
        cfg as never,
        data as never,
      );
      return sourced(reserve, {
        sourceName: "Lendle ProtocolDataProvider (eth_call)",
        url: `${explorerBaseFor(network)}/address/${LENDLE.protocolDataProvider}`,
        observedAt,
        kind: "fact",
        note: `getReserveConfigurationData + getReserveData for ${asset}`,
      });
    },
  };
}
