import { useState } from "react";
import { AssetChips } from "./AssetChips";
import type { Network } from "../../lib/api";
import type { AnalyzedAsset } from "../../lib/history";

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
  network: Network;
  recentAssets: AnalyzedAsset[];
  onQueryChange: (q: string) => void;
  onPickAsset: (sym: string) => void;
  onRun: () => void;
  onRunExample: (q: string) => void;
  onNetworkChange: (n: Network) => void;
  onAnalyze: (input: string, network: Network) => void;
}

export function AskHome({
  assets,
  asset,
  query,
  loading,
  recent,
  network,
  recentAssets,
  onQueryChange,
  onPickAsset,
  onRun,
  onRunExample,
  onNetworkChange,
  onAnalyze,
}: Props) {
  const [anyInput, setAnyInput] = useState("");
  const runAny = () => {
    if (!loading && anyInput.trim()) onAnalyze(anyInput, network);
  };
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

      <div className="mb-3 mt-[26px] font-mono text-[11px] tracking-[0.12em] text-mut">PICK AN ASSET (FEATURED)</div>
      <div className="mb-8">
        <AssetChips assets={assets} active={asset} onPick={onPickAsset} size="md" />
      </div>

      {/* Analyze ANY Mantle token — paste an address or type a symbol; mainnet or Sepolia. */}
      <div className="mb-9 max-w-[760px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] tracking-[0.12em] text-mut">OR ANALYZE ANY MANTLE ASSET</span>
          <div className="flex border-2 border-line font-mono text-[10px]">
            {(["mainnet", "sepolia"] as const).map((n) => (
              <button
                key={n}
                onClick={() => onNetworkChange(n)}
                className={`px-2.5 py-1 uppercase tracking-[0.06em] transition-colors ${
                  network === n ? "bg-acid text-ink" : "text-mut hover:text-paper"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-2 border-paper py-3 pl-[18px] pr-3">
          <span className="font-mono text-[15px] text-acid">⌖</span>
          <input
            value={anyInput}
            onChange={(e) => setAnyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runAny();
            }}
            placeholder="Paste a token address (0x…) or type a symbol — any Mantle token"
            className="min-w-0 flex-1 bg-transparent font-mono text-[14px] text-paper caret-acid outline-none placeholder:text-mut2"
          />
          <button
            onClick={runAny}
            disabled={loading || !anyInput.trim()}
            className="shrink-0 border-2 border-paper bg-transparent px-4 py-2 font-mono text-xs font-semibold tracking-[0.04em] text-paper transition-colors hover:bg-paper hover:text-ink disabled:opacity-40"
          >
            ANALYZE →
          </button>
        </div>
        <p className="mt-2 font-mono text-[10px] leading-[1.6] text-mut2">
          Featured assets are curated RWAs; any other token is analyzed live on-chain and labelled
          (issuer/context unverified). MantleFlow is RWA-focused — non-RWA tokens are flagged, not blocked.
        </p>
        {recentAssets.length > 0 ? (
          <div className="mt-4">
            <div className="mb-1.5 font-mono text-[10px] tracking-[0.1em] text-mut2">RECENTLY ANALYZED</div>
            <div className="flex flex-wrap gap-1.5">
              {recentAssets.slice(0, 8).map((r) => (
                <button
                  key={r.address + r.network}
                  onClick={() => onAnalyze(r.address, r.network)}
                  title={`${r.address} · ${r.network}`}
                  className="border border-line px-2 py-1 font-mono text-[11px] text-mut transition-colors hover:border-acid hover:text-acid"
                >
                  {r.symbol}
                  {r.network === "sepolia" ? " ·sep" : ""}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
