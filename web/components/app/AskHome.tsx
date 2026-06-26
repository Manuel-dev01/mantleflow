import { AssetChips } from "./AssetChips";

const EXAMPLES = [
  "I hold $1M of MI4 — where can I exit it, and am I gated?",
  "Map the distribution of mETH on Mantle.",
  "What lends against fBTC on Mantle?",
  "Is USDY freely transferable, or gated?",
];

interface Props {
  assets: string[];
  asset: string;
  query: string;
  loading: boolean;
  recent: { q: string; t: string }[];
  onQueryChange: (q: string) => void;
  onPickAsset: (sym: string) => void;
  onRun: () => void;
  onRunExample: (q: string) => void;
}

export function AskHome({
  assets,
  asset,
  query,
  loading,
  recent,
  onQueryChange,
  onPickAsset,
  onRun,
  onRunExample,
}: Props) {
  return (
    <div className="flex max-w-[980px] flex-1 flex-col px-6 py-16 md:px-[34px]">
      <div className="mb-5 font-mono text-xs tracking-[0.14em] text-mut">NEW QUERY</div>
      <h1 className="m-0 mb-3 font-display text-[clamp(36px,6vw,76px)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
        Ask about
        <br />
        any asset.
      </h1>
      <p className="m-0 mb-9 max-w-[520px] text-[17px] text-mut">
        Reachability, depth, collateral, exit routes, or who can hold it. One question, the whole
        distribution map.
      </p>

      <div className="mb-[18px] flex max-w-[760px] items-center gap-3.5 border-2 border-paper py-3.5 pl-[22px] pr-3.5">
        <span className="font-mono text-[18px] text-acid">›</span>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) onRun();
          }}
          placeholder={`Where can I sell ${asset} on Mantle right now?`}
          className="flex-1 bg-transparent font-mono text-[15px] text-paper caret-acid outline-none placeholder:text-mut2"
        />
        <button
          onClick={onRun}
          disabled={loading}
          className="border-2 border-acid bg-acid px-[22px] py-3 font-mono text-sm font-semibold tracking-[0.04em] text-ink transition-colors hover:bg-ink hover:text-acid disabled:opacity-50"
        >
          {loading ? "RUNNING…" : "RUN →"}
        </button>
      </div>

      <div className="mb-3 mt-[26px] font-mono text-[11px] tracking-[0.12em] text-mut">PICK AN ASSET</div>
      <div className="mb-9">
        <AssetChips assets={assets} active={asset} onPick={onPickAsset} size="md" />
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.12em] text-mut">TRY ASKING</div>
          <div className="flex flex-col border-t-2 border-line">
            {EXAMPLES.map((p) => (
              <button
                key={p}
                onClick={() => onRunExample(p)}
                className="group flex items-center gap-3 border-b-2 border-line py-3.5 text-left text-sm text-paper transition-colors hover:text-acid"
              >
                <span className="font-mono text-mut group-hover:text-acid">↳</span>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.12em] text-mut">RECENT</div>
          <div className="flex flex-col border-t-2 border-line">
            {recent.length === 0 ? (
              <div className="py-3.5 font-mono text-[13px] text-mut2">No queries yet this session.</div>
            ) : (
              recent.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between border-b-2 border-line py-3.5 font-mono text-[13px] text-mut"
                >
                  <span className="truncate pr-3">{r.q}</span>
                  <span className="text-mut2">{r.t}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
