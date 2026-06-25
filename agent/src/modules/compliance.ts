import { type Address, type PublicClient } from "viem";
import { type MantleNetwork } from "../config/chains.js";
import { type ComplianceGate } from "../engine/types.js";
import { type Sourced, sourced } from "../types/source-receipt.js";
import type { ContractSource, EtherscanAdapter } from "../adapters/etherscan.js";

/**
 * Detect transfer-restriction / compliance gating on a token. Reporting the gate IS the research
 * result for a permissioned RWA like MI4 (Securitize transfer agent) — distribution, not issuance,
 * is the hard problem. Detection works on the implementation ABI (resolving proxies) + known issuer
 * patterns. Pure analysis over a fetched ABI so it is unit-testable without network.
 */

interface GateSignal {
  /** Function names whose presence indicates this mechanism. */
  fns: string[];
  mechanism: string;
}

const GATE_SIGNALS: GateSignal[] = [
  {
    mechanism: "Securitize DS-Token transfer-agent allowlist",
    fns: ["preTransferCheck", "registryService", "complianceService", "getComplianceService"],
  },
  {
    mechanism: "ERC-1404 transfer restriction",
    fns: ["detectTransferRestriction", "messageForTransferRestriction"],
  },
  {
    mechanism: "Allowlist / whitelist gating",
    fns: ["isWhitelisted", "addToWhitelist", "isAllowed", "setKycStatus", "kycStatus"],
  },
  {
    mechanism: "Transfer pause / freeze control",
    fns: ["pause", "unpause", "freeze", "isFrozen"],
  },
];

function fnNamesFromAbi(abiJson: string): string[] {
  try {
    const abi = JSON.parse(abiJson) as Array<{ type?: string; name?: string }>;
    return abi.filter((e) => e.type === "function" && e.name).map((e) => e.name as string);
  } catch {
    return [];
  }
}

/** Pure: given the set of function names on a contract, identify gating mechanisms. */
export function detectGatesFromFunctions(fnNames: string[]): string[] {
  const present = new Set(fnNames);
  const found: string[] = [];
  for (const sig of GATE_SIGNALS) {
    if (sig.fns.some((f) => present.has(f))) found.push(sig.mechanism);
  }
  return found;
}

/**
 * Full compliance check: fetch the token's source (resolving a proxy to its implementation),
 * extract the ABI, and identify gating mechanisms. Returns a ComplianceGate with sourced evidence.
 */
export async function checkComplianceGate(
  _client: PublicClient,
  network: MantleNetwork,
  token: Address,
  etherscan: EtherscanAdapter,
  observedAt: string,
): Promise<Sourced<ComplianceGate>> {
  const tokenSrc = await etherscan.getContractSource(network, token, observedAt);
  let effective: ContractSource = tokenSrc.value;
  const evidence: ComplianceGate["evidence"] = [];

  // Resolve proxy → implementation for the real ABI.
  if (tokenSrc.value.isProxy && tokenSrc.value.implementation) {
    const implSrc = await etherscan.getContractSource(
      network,
      tokenSrc.value.implementation,
      observedAt,
    );
    effective = implSrc.value;
    evidence.push(
      sourced(
        `Token is a proxy; implementation ${tokenSrc.value.implementation} (${effective.contractName})`,
        implSrc.receipt,
      ),
    );
  }

  const fnNames = fnNamesFromAbi(effective.abi);
  const mechanisms = detectGatesFromFunctions(fnNames);

  for (const m of mechanisms) {
    evidence.push(sourced(`Detected: ${m}`, tokenSrc.receipt));
  }

  const gate: ComplianceGate = {
    isGated: mechanisms.length > 0,
    mechanism: mechanisms[0] ?? null,
    evidence,
  };
  return sourced(gate, tokenSrc.receipt);
}
