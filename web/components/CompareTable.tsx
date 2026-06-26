import type { DistributionMap, SubScoreId } from "@mantleflow/agent";

const COLS: { id: SubScoreId; label: string }[] = [
  { id: "reachability", label: "Reach" },
  { id: "liquidity-depth", label: "Depth" },
  { id: "fragmentation", label: "Frag" },
  { id: "borrowability", label: "Borrow" },
  { id: "compliance", label: "Compliance" },
];

function cell(map: DistributionMap, id: SubScoreId) {
  const s = map.subScores.find((x) => x.id === id);
  if (!s || s.value === null) {
    return <span className="text-zinc-600" title={s?.explanation}>—</span>;
  }
  // colour by value: red→amber→green
  const v = s.value;
  const color = v >= 67 ? "text-emerald-400" : v >= 34 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`font-semibold ${color}`} title={s.explanation}>
      {v}
    </span>
  );
}

/** Side-by-side ranking of every tracked asset by its distribution sub-scores. */
export function CompareTable({ maps }: { maps: DistributionMap[] }) {
  const ranked = [...maps].sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));
  return (
    <div className="overflow-x-auto rounded-lg border border-edge bg-panel">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2">Asset</th>
            <th className="px-3 py-2" title="Weighted partial composite (excludes cross-chain)">Score</th>
            {COLS.map((c) => (
              <th key={c.id} className="px-3 py-2 text-center">{c.label}</th>
            ))}
            <th className="px-3 py-2">Headline</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((m) => (
            <tr key={m.asset.symbol} className="border-b border-edge/50 last:border-0">
              <td className="px-3 py-2">
                <a
                  href={`https://explorer.mantle.xyz/address/${m.asset.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-zinc-100 hover:text-accent"
                >
                  {m.asset.symbol}
                </a>
                <div className="text-[11px] text-zinc-500">{m.asset.name}</div>
              </td>
              <td className="px-3 py-2">
                <span className="text-lg font-bold text-accent">{m.composite ?? "—"}</span>
                <span className="text-[10px] text-zinc-600">/100</span>
              </td>
              {COLS.map((c) => (
                <td key={c.id} className="px-3 py-2 text-center">{cell(m, c.id)}</td>
              ))}
              <td className="px-3 py-2 text-xs text-zinc-400">{m.headlines[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-zinc-600">
        Each cell is a 0–100 sub-score from live Mantle data; hover for the sourced explanation.
        Score = weighted partial composite (cross-chain excluded — Phase 4). A “—” under Compliance
        means it wasn’t source-verified in this batch run — open that asset above for its full,
        source-verified gating (e.g. MI4’s Securitize allowlist).
      </p>
    </div>
  );
}
