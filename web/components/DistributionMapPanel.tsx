import type { DistributionMap, SourceReceipt, SubScore } from "@mantleflow/agent";
import { Receipt } from "./Receipt";

const STATUS_STYLE: Record<string, string> = {
  computed: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  "not-yet-computed": "bg-zinc-800 text-zinc-500 border-zinc-700",
  "insufficient-data": "bg-amber-900/40 text-amber-300 border-amber-700/50",
  "not-applicable": "bg-zinc-800 text-zinc-500 border-zinc-700",
};

function receiptsOf(s: SubScore): SourceReceipt[] {
  return s.inputs
    .map((i) => (i as { receipt?: SourceReceipt }).receipt)
    .filter((r): r is SourceReceipt => !!r);
}

function SubScoreCard({ s }: { s: SubScore }) {
  return (
    <div className="rounded-lg border border-edge bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">{s.label}</h3>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
            STATUS_STYLE[s.status] ?? STATUS_STYLE["not-applicable"]
          }`}
        >
          {s.status.replace(/-/g, " ")}
        </span>
      </div>
      <div className="mt-1 text-2xl font-bold text-accent">
        {s.value === null ? "—" : `${s.value}/100`}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.explanation}</p>
      {receiptsOf(s).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-edge pt-2">
          {receiptsOf(s).map((r, i) => (
            <Receipt key={i} receipt={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DistributionMapPanel({ map }: { map: DistributionMap }) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-edge bg-panel p-4">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Asset</div>
        <div className="mt-0.5 text-lg font-semibold text-zinc-100">
          {map.asset.name} <span className="text-accent">({map.asset.symbol})</span>
        </div>
        <a
          href={`https://explorer.mantle.xyz/address/${map.asset.address}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-zinc-500 hover:underline"
        >
          {map.asset.address}
        </a>
        <div className="mt-3 space-y-1">
          {map.headlines.map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-zinc-200">
              <span className="text-accent">▸</span>
              <span>{h}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          Composite Distribution Score:{" "}
          {map.composite === null
            ? "not computed (required sub-scores pending — Phase 2/4)"
            : `${map.composite}/100`}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {map.subScores.map((s) => (
          <SubScoreCard key={s.id} s={s} />
        ))}
      </div>
    </section>
  );
}
