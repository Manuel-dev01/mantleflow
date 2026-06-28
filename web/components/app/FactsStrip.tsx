import type { DistributionMap } from "@mantleflow/agent";
import { fmtUsd, fmtSupply } from "../../lib/format";
import { SourceTag } from "../SourceTag";

/**
 * Basic token market facts shown on every tab — price, market cap, FDV, 24h volume (GeckoTerminal)
 * + on-chain total supply. Surfaces real context even for assets with no Mantle DEX venue (the
 * "huge global asset, zero on-chain Mantle trading venue" contrast). Null fields render "—".
 */
export function FactsStrip({ facts, symbol }: { facts: DistributionMap["facts"] | null | undefined; symbol: string }) {
  if (!facts) return null;
  const receipt = facts.receipts[0];
  const cells: { k: string; v: string }[] = [
    { k: "PRICE", v: facts.priceUsd != null ? fmtUsd(facts.priceUsd) : "—" },
    { k: "MARKET CAP", v: facts.marketCapUsd != null ? fmtUsd(facts.marketCapUsd) : "—" },
    { k: "FDV", v: facts.fdvUsd != null ? fmtUsd(facts.fdvUsd) : "—" },
    { k: "24H VOL", v: facts.volume24hUsd != null ? fmtUsd(facts.volume24hUsd) : "—" },
    { k: "SUPPLY", v: `${fmtSupply(facts.totalSupply, facts.decimals)} ${symbol}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-2 border-b-2 border-line px-[26px] py-2.5 font-mono text-[11px]">
      {cells.map((c) => (
        <span key={c.k} className="flex items-baseline gap-1.5">
          <span className="text-mut2">{c.k}</span>
          <span className={c.v === "—" || c.v.startsWith("— ") ? "text-mut" : "text-paper"}>{c.v}</span>
        </span>
      ))}
      {receipt ? (
        <span className="flex items-center gap-1 text-mut2">
          <SourceTag receipt={receipt} label="" />
        </span>
      ) : null}
    </div>
  );
}
