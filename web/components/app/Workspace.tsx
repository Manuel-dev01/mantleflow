import type { DistributionMap } from "@mantleflow/agent";
import { AssetChips } from "./AssetChips";
import { FactsStrip } from "./FactsStrip";
import { fmtWhen } from "../../lib/format";
import { OverviewTab } from "./tabs/Overview";
import { DistributionTab } from "./tabs/Distribution";
import { LiquidityTab } from "./tabs/Liquidity";
import { RoutesTab } from "./tabs/Routes";
import { GatesTab } from "./tabs/Gates";

export type TabId = "overview" | "distribution" | "liquidity" | "routes" | "gates";

const TABS: { id: TabId; label: string; num: string }[] = [
  { id: "overview", label: "OVERVIEW", num: "01" },
  { id: "distribution", label: "DISTRIBUTION", num: "02" },
  { id: "liquidity", label: "LIQUIDITY", num: "03" },
  { id: "routes", label: "ROUTES", num: "04" },
  { id: "gates", label: "GATES", num: "05" },
];

interface Props {
  assets: string[];
  asset: string;
  map: DistributionMap | null;
  answer: string | null;
  loading: boolean;
  error: string | null;
  tab: TabId;
  onTab: (t: TabId) => void;
  onSwitchAsset: (sym: string) => void;
  onNewQuery: () => void;
}

export function Workspace({
  assets,
  asset,
  map,
  answer,
  loading,
  error,
  tab,
  onTab,
  onSwitchAsset,
  onNewQuery,
}: Props) {
  return (
    <div className="flex flex-1 flex-col">
      {/* context bar */}
      <div className="flex flex-wrap items-center justify-between gap-5 border-b-2 border-paper px-[26px] py-4">
        <div className="flex items-baseline gap-3.5">
          <span className="font-display text-[28px] font-extrabold tracking-[-0.02em]">{map?.asset.symbol ?? asset}</span>
          <span className="font-mono text-xs text-mut">{map?.asset.name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-[18px]">
          <AssetChips assets={assets} active={asset} onPick={onSwitchAsset} size="sm" />
          <button
            onClick={onNewQuery}
            className="border-2 border-acid bg-transparent px-3.5 py-2 font-mono text-[11px] tracking-[0.04em] text-acid transition-colors hover:bg-acid hover:text-ink"
          >
            + NEW QUERY
          </button>
        </div>
      </div>

      {/* token market facts — shown on every tab */}
      {map ? <FactsStrip facts={map.facts} symbol={map.asset.symbol} /> : null}

      <div className="grid flex-1 md:grid-cols-[220px_1fr]">
        {/* left nav */}
        <div className="flex flex-col border-b-2 border-paper md:border-b-0 md:border-r-2">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`flex items-center gap-3 border-b-2 border-line px-[18px] py-[18px] text-left font-mono text-[13px] font-semibold transition-colors ${
                  active ? "bg-acid text-ink" : "bg-transparent text-paper hover:bg-paper/5"
                }`}
              >
                <span className="text-[11px] opacity-70">{t.num}</span>
                {t.label}
              </button>
            );
          })}
          <div className="mt-auto p-[18px] font-mono text-[10px] leading-[1.9] text-mut2">
            CHAIN · MANTLE {map?.asset.network?.toUpperCase() ?? ""}
            <br />
            SOURCE · LIVE eth_call
            <br />
            UPDATED · {map ? fmtWhen(map.generatedAt) : "—"}
          </div>
        </div>

        {/* panel */}
        <div className="relative min-h-[480px]">
          {loading ? (
            <PanelMessage text="Reading live Mantle state…" />
          ) : error ? (
            <PanelMessage text={error} tone="error" />
          ) : !map ? (
            <PanelMessage text="No distribution map yet — run a query." />
          ) : tab === "overview" ? (
            <OverviewTab map={map} answer={answer} />
          ) : tab === "distribution" ? (
            <DistributionTab map={map} />
          ) : tab === "liquidity" ? (
            <LiquidityTab map={map} />
          ) : tab === "routes" ? (
            <RoutesTab map={map} />
          ) : (
            <GatesTab map={map} />
          )}
        </div>
      </div>
    </div>
  );
}

function PanelMessage({ text, tone = "mut" }: { text: string; tone?: "mut" | "error" }) {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center p-10">
      <span className={`font-mono text-sm ${tone === "error" ? "text-paper" : "text-mut"}`}>
        {tone === "error" ? `⚠ ${text}` : text}
      </span>
    </div>
  );
}
