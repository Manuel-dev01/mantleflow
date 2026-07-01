import type { AssetClassification, AssetContext } from "../engine/types.js";
import type { Sourced, SourceReceipt } from "../types/source-receipt.js";

/**
 * Heuristic RWA / capital-market classifier. MantleFlow is RWA-focused, so when an ARBITRARY token is
 * analyzed we label how RWA-like it looks — a SOFT signal, never a hard fact and never a hard gate.
 * Every signal is a SourceReceipt of kind estimate/assumption; a curated featured asset is RWA by
 * definition. Inputs are on-chain / GeckoTerminal only (no CoinGecko dependency).
 */
export interface ClassifyInput {
  curated: boolean;
  symbol: string;
  name: string;
  complianceDetermined: boolean;
  complianceTier: "permissioned" | "restrictable" | null;
  context?: AssetContext | null;
  issuer?: string | undefined;
  observedAt: string;
}

// Strong real-world-asset keywords; and softer capital-market (stable / LST / wrapped-BTC-ETH) hints.
const RWA_KEYWORDS =
  /(rwa|treasur|t-?bill|bond|note|gilt|money.?market|real.?world|equit|stock|share|gold|xau|silver|commodit|credit|invoice)/i;
const CAPMKT_KEYWORDS =
  /(usd|usdt|usdc|usde|usdy|dai|stable|staked|steth|reth|meth|cmeth|lst|lrt|restak|wbtc|fbtc|btc|yield|susd)/i;

function heuristic(
  sourceName: string,
  observedAt: string,
  text: string,
  kind: "estimate" | "assumption" = "estimate",
): Sourced<string> {
  const receipt: SourceReceipt = {
    sourceName,
    url: "",
    observedAt,
    kind,
    note: "MantleFlow RWA classifier — heuristic signal, not a verified fact",
  };
  return { value: text, receipt };
}

export function classifyAsset(input: ClassifyInput): AssetClassification {
  const signals: Sourced<string>[] = [];

  if (input.curated) {
    signals.push(
      heuristic(
        "MantleFlow curated registry",
        input.observedAt,
        `Curated MantleFlow asset${input.issuer ? ` (issuer: ${input.issuer})` : ""} — a verified Mantle RWA / capital-market asset.`,
        "assumption",
      ),
    );
    return { class: "rwa", confidence: "high", signals };
  }

  let score = 0; // higher ⇒ more RWA / capital-market-like

  if (input.complianceDetermined && input.complianceTier === "permissioned") {
    score += 3;
    signals.push(
      heuristic(
        "On-chain compliance",
        input.observedAt,
        "Permissioned transfer gate (allowlist / transfer-agent) detected — a securities-like control typical of tokenized RWAs.",
      ),
    );
  } else if (input.complianceDetermined && input.complianceTier === "restrictable") {
    score += 1;
    signals.push(
      heuristic(
        "On-chain compliance",
        input.observedAt,
        "Blocklist / freeze / sanctions control detected — common in regulated stablecoins and RWAs.",
      ),
    );
  }

  if (input.context?.coingeckoId) {
    signals.push(
      heuristic(
        "GeckoTerminal listing",
        input.observedAt,
        `Listed on CoinGecko as "${input.context.coingeckoId}" — an established, indexed token.`,
      ),
    );
  }

  const hay = `${input.symbol} ${input.name}`;
  if (RWA_KEYWORDS.test(hay)) {
    score += 2;
    signals.push(
      heuristic(
        "Name/symbol heuristic",
        input.observedAt,
        "Name/symbol contains real-world-asset keywords (treasury / bond / equity / commodity / RWA).",
        "assumption",
      ),
    );
  } else if (CAPMKT_KEYWORDS.test(hay)) {
    score += 1;
    signals.push(
      heuristic(
        "Name/symbol heuristic",
        input.observedAt,
        "Name/symbol suggests a capital-market asset (stablecoin / LST / wrapped BTC or ETH).",
        "assumption",
      ),
    );
  }

  const cls: AssetClassification["class"] =
    score >= 3 ? "rwa" : score >= 1 ? "capital-market" : signals.length > 0 ? "uncertain" : "not-rwa";
  const confidence: AssetClassification["confidence"] =
    input.complianceTier === "permissioned" ? "high" : score >= 2 ? "medium" : "low";

  if (cls === "not-rwa") {
    signals.push(
      heuristic(
        "MantleFlow classifier",
        input.observedAt,
        "No RWA / capital-market signals found (no transfer gate, no matching keywords, no listing) — likely not a tokenized RWA. Analyzed on-chain anyway.",
        "assumption",
      ),
    );
  }
  return { class: cls, confidence, signals };
}
