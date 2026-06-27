import type { Sourced } from "../../types/source-receipt.js";
import type { CrossChainReach } from "../../adapters/crosschain.js";
import type { SubScore } from "../types.js";

/**
 * Cross-chain reach sub-score. We only score what we positively verified (CCIP membership, LayerZero
 * OFT endpoint). When NO route is verified we return `insufficient-data` (null, excluded from the
 * composite) rather than a false 0 — some issuers bridge via mechanisms we don't probe, so absence of
 * a detected route is not proof of no cross-chain reach. Every route (incl. negatives) is sourced.
 */
export function crossChainSubScore(reach: CrossChainReach): SubScore {
  const inputs: Sourced<unknown>[] = reach.routes.map((r) => ({ value: r, receipt: r.receipt }));
  const available = reach.routes.filter((r) => r.available);

  if (available.length === 0) {
    return {
      id: "cross-chain",
      label: "Cross-chain reach",
      status: "insufficient-data",
      value: null,
      explanation:
        "No permissionless cross-chain route verified: not in Mantle's CCIP token set and no LayerZero OFT endpoint on the token. Other issuer-specific bridges were not probed — we do not claim a value we have not sourced.",
      inputs,
    };
  }

  // Verified routes → computed. LayerZero OFT (omnichain) is the strong signal; CCIP adds reach.
  const hasOft = available.some((r) => r.protocol === "LayerZero-OFT");
  const hasCcip = available.some((r) => r.protocol === "CCIP");
  const value = Math.min(100, (hasOft ? 70 : 0) + (hasCcip ? 45 : 0));

  return {
    id: "cross-chain",
    label: "Cross-chain reach",
    status: "computed",
    value,
    explanation: `Verified route(s): ${available.map((r) => r.protocol).join(", ")}. ${
      hasOft ? "Omnichain via LayerZero (OFT). " : ""
    }${hasCcip ? "CCIP lanes available. " : ""}Per-tx bridge fees are dynamic — not quoted.`,
    inputs,
  };
}
