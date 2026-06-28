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

/**
 * Two tiers of holder restriction — a real distribution distinction:
 *  - "permissioned": you must be APPROVED to hold (allowlist / transfer-agent / ERC-1404). Most of the
 *    world is gated OUT. The strong gate (e.g. MI4's Securitize allowlist).
 *  - "restrictable": anyone can hold UNLESS specifically blocked (blocklist / sanctions / account
 *    freeze). Standard compliant-asset control (USDC-style); normal holders are free, but the issuer
 *    can block/freeze specific accounts (e.g. cmETH sanctions list, USDY/fBTC/mETH blocklists).
 */
export type GateTier = "permissioned" | "restrictable";

interface GateSignal {
  /** Function names whose presence indicates this mechanism. */
  fns: string[];
  mechanism: string;
  tier: GateTier;
}

const GATE_SIGNALS: GateSignal[] = [
  {
    tier: "permissioned",
    mechanism: "Securitize DS-Token transfer-agent allowlist",
    fns: ["preTransferCheck", "registryService", "complianceService", "getComplianceService"],
  },
  {
    tier: "permissioned",
    mechanism: "ERC-1404 transfer restriction",
    fns: ["detectTransferRestriction", "messageForTransferRestriction"],
  },
  {
    tier: "permissioned",
    mechanism: "Allowlist / whitelist / KYC gating",
    fns: ["isWhitelisted", "addToWhitelist", "isAllowed", "setKycStatus", "kycStatus"],
  },
  {
    tier: "restrictable",
    mechanism: "Sanctions screening",
    fns: ["isSanctioned", "sanctionsList", "setSanctionsList"],
  },
  {
    tier: "restrictable",
    mechanism: "Account blocklist / freeze",
    fns: [
      "lockUser", "unlockUser", "userBlocked", "isBlocked",
      "blocklist", "setBlocklist", "getBlockLists", "addBlockListContract", "removeBlockListContract",
      "blacklist", "isBlacklisted", "addBlackList", "removeBlackList", "getBlackListStatus",
      "blockAccount", "unblockAccount", "freezeAccount", "unfreezeAccount", "isFrozen",
    ],
  },
  // NOTE: global `pause`/`unpause` (OpenZeppelin Pausable) is deliberately NOT a gating signal — it
  // halts ALL transfers in an emergency but doesn't gate specific holders; flagging every pausable
  // token over-reports. Only the per-holder controls above count.
];

function fnNamesFromAbi(abiJson: string): string[] {
  try {
    const abi = JSON.parse(abiJson) as Array<{ type?: string; name?: string }>;
    return abi.filter((e) => e.type === "function" && e.name).map((e) => e.name as string);
  } catch {
    return [];
  }
}

/** Pure: given the set of function names on a contract, identify gating mechanisms (with tier). */
export function detectGatesFromFunctions(fnNames: string[]): { mechanism: string; tier: GateTier }[] {
  const present = new Set(fnNames);
  const found: { mechanism: string; tier: GateTier }[] = [];
  for (const sig of GATE_SIGNALS) {
    if (sig.fns.some((f) => present.has(f))) found.push({ mechanism: sig.mechanism, tier: sig.tier });
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
  } else if (tokenSrc.value.isProxy && !tokenSrc.value.implementation) {
    // A proxy whose implementation we couldn't resolve (e.g. the lightweight getabi fallback). Scanning
    // the proxy's own ABI would FALSE-CLEAR gates that live in the impl — so report insufficient-data.
    return sourced(
      { determined: false, isGated: false, tier: null, mechanism: null, evidence: [] },
      tokenSrc.receipt,
    );
  }

  const fnNames = fnNamesFromAbi(effective.abi);
  const mechanisms = detectGatesFromFunctions(fnNames);

  for (const m of mechanisms) {
    evidence.push(sourced(`Detected: ${m.mechanism} (${m.tier})`, tokenSrc.receipt));
  }

  // Tier = the strongest restriction found. Permissioned (allowlist) outranks restrictable (blocklist);
  // the primary mechanism is the strongest one. No matches → freely transferable.
  const permissioned = mechanisms.find((m) => m.tier === "permissioned");
  const restrictable = mechanisms.find((m) => m.tier === "restrictable");
  const primary = permissioned ?? restrictable ?? null;

  const gate: ComplianceGate = {
    determined: true,
    isGated: !!permissioned, // strong gate (must be approved) only; blocklist is "restrictable", not gated
    tier: primary ? primary.tier : null,
    mechanism: primary?.mechanism ?? null,
    evidence,
  };
  return sourced(gate, tokenSrc.receipt);
}
