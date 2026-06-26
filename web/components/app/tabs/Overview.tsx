import ReactMarkdown from "react-markdown";
import type { DistributionMap } from "@mantleflow/agent";
import { overviewStats } from "../../../lib/derive";
import { SourceTag } from "../../SourceTag";

/**
 * Overview = the agent's plain-language answer (real LLM output when present, else the engine's own
 * headlines) + four real summary stats, each with a source receipt.
 */
export function OverviewTab({ map, answer }: { map: DistributionMap; answer: string | null }) {
  const s = overviewStats(map);
  const cells = [
    { k: "VENUES", v: s.venues.value, tone: s.venues.tone, receipt: s.venues.receipt },
    { k: "DEPTH", v: s.depth.value, tone: s.depth.tone, receipt: s.depth.receipt },
    { k: "BEST SLIP / $250K", v: s.bestSlip.value, tone: s.bestSlip.tone, receipt: s.bestSlip.receipt },
    { k: "HOLDING", v: s.holding.value, tone: s.holding.tone, receipt: s.holding.receipt },
  ];

  return (
    <div className="px-[38px] py-10">
      <div className="mb-[18px] flex items-center gap-2.5">
        <span className="h-2 w-2 bg-acid" />
        <span className="font-mono text-xs tracking-[0.1em] text-mut">AGENT ANSWER</span>
      </div>

      {answer ? (
        <div className="answer mb-10 max-w-[920px] font-display text-[clamp(20px,2.4vw,30px)] font-medium leading-[1.3]">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      ) : (
        <p className="m-0 mb-10 max-w-[920px] font-display text-[clamp(22px,2.6vw,34px)] font-medium leading-[1.28] tracking-[-0.01em]">
          {map.headlines.join(". ")}.
        </p>
      )}

      <div className="grid grid-cols-2 border-2 border-paper md:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.k}
            className={`px-[22px] py-6 ${i < cells.length - 1 ? "border-r-2 border-paper" : ""} ${i < 2 ? "border-b-2 border-paper md:border-b-0" : ""}`}
          >
            <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-mut">
              {c.k} {c.receipt ? <SourceTag receipt={c.receipt} /> : null}
            </div>
            <div
              className={`mt-2 font-display text-[34px] font-extrabold leading-none ${
                c.tone === "acid" ? "text-acid" : c.tone === "mut" ? "text-mut" : "text-paper"
              }`}
            >
              {c.v}
            </div>
          </div>
        ))}
      </div>

      {map.composite != null ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-line pt-5">
          <span className="font-mono text-xs text-mut">COMPOSITE</span>
          <span className="font-display text-[22px] font-extrabold text-acid">{map.composite}</span>
          <span className="font-mono text-[11px] text-mut2">/100 · {map.compositeNote}</span>
        </div>
      ) : null}

      <div className="mt-4 border-t-2 border-line pt-5 font-mono text-xs text-mut">
        DRILL DOWN → distribution map · liquidity depth · exit routes · compliance gates
      </div>
    </div>
  );
}
