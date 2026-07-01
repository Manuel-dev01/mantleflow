"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DistributionMap } from "@mantleflow/agent";
import { getMap, runQuery, type Network } from "../../lib/api";
import { addRecentAsset, getRecentAssets, type AnalyzedAsset } from "../../lib/history";
import { ASSETS } from "../../lib/assets";
import { AskHome } from "../../components/app/AskHome";
import { Workspace, type TabId } from "../../components/app/Workspace";
import { AgentIdentity } from "../../components/app/AgentIdentity";

const exampleFor = (sym: string) =>
  sym === "MI4"
    ? "I hold $1M of MI4 — where can I exit it, what can I borrow against it, and am I gated?"
    : `Map the distribution of ${sym} on Mantle: where can I trade it, how deep is liquidity, can I borrow against it, and is it gated?`;

interface Recent {
  q: string;
  t: string;
}

export default function AppPage() {
  const [view, setView] = useState<"home" | "workspace">("home");
  const [asset, setAsset] = useState<string>("MI4");
  const [query, setQuery] = useState(exampleFor("MI4"));
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<DistributionMap | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [network, setNetwork] = useState<Network>("mainnet");
  const [recentAssets, setRecentAssets] = useState<AnalyzedAsset[]>([]);
  useEffect(() => setRecentAssets(getRecentAssets()), []);

  function pickAssetHome(sym: string) {
    setAsset(sym);
    setQuery(exampleFor(sym));
  }

  // RUN actually answers the question: the FREE basic LLM query returns a real NL answer + the
  // distribution map (one call). The deeper cross-asset "AI deep-dive" stays the x402-paid premium in
  // the Overview tab. If the query names no asset, pass the selected one as context for the LLM.
  async function run(q: string) {
    const named = ASSETS.find((s) => q.toLowerCase().includes(s.toLowerCase()));
    const sym = named ?? asset;
    const effectiveQ = named ? q : `${q} (asset: ${sym})`;
    setLoading(true);
    setError(null);
    setView("workspace");
    setTab("overview");
    setAnswer(null);
    setAsset(sym);
    setRecent((r) => [{ q, t: "now" }, ...r].slice(0, 4));
    try {
      const res = await runQuery(effectiveQ);
      if (res.error) setError(res.error);
      setAnswer(res.answer ?? null);
      // The orchestrator returns the map when it calls the map tool; guarantee tab data either way.
      let m = res.map ?? null;
      if (!m) {
        const mr = await getMap(sym);
        m = mr.map ?? null;
        if (mr.error && !res.error) setError(mr.error);
      }
      setMap(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Analyze ANY Mantle token — a curated symbol OR an arbitrary contract address, on the chosen
  // network. Map-only (no LLM); remembers the asset in localStorage for quick re-access.
  async function analyze(input: string, net: Network) {
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setView("workspace");
    setTab("overview");
    setAnswer(null);
    try {
      const res = await getMap(q, net);
      if (res.error) {
        setError(res.error);
        setMap(null);
      } else {
        const m = res.map ?? null;
        setMap(m);
        if (m) {
          setAsset(m.asset.symbol);
          addRecentAsset({ address: m.asset.address, symbol: m.asset.symbol, network: m.asset.network });
          setRecentAssets(getRecentAssets());
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Fast asset switch inside the workspace — map only, no LLM (answer falls back to headlines).
  async function switchAsset(sym: string) {
    setAsset(sym);
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await getMap(sym);
      if (res.error) setError(res.error);
      setMap(res.map ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      {/* top bar */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-paper px-4 py-3 font-mono md:px-[26px] md:py-3.5">
        <div className="flex items-center gap-3 md:gap-5">
          <span className="text-sm font-semibold tracking-[0.04em]">MANTLEFLOW</span>
          <span className="hidden items-center gap-1.5 text-[11px] text-mut sm:flex">
            <span className="h-[7px] w-[7px] bg-acid" />
            LIVE · MANTLE L2
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <AgentIdentity />
          <Link
            href="/"
            className="whitespace-nowrap border-2 border-paper bg-transparent px-3 py-2 font-mono text-[11px] tracking-[0.04em] text-paper transition-colors hover:bg-paper hover:text-ink md:px-3.5"
          >
            <span className="sm:hidden">EXIT ↗</span>
            <span className="hidden sm:inline">← EXIT TO SITE</span>
          </Link>
        </div>
      </div>

      {view === "home" ? (
        <AskHome
          assets={[...ASSETS]}
          asset={asset}
          query={query}
          loading={loading}
          recent={recent}
          network={network}
          recentAssets={recentAssets}
          onQueryChange={setQuery}
          onPickAsset={pickAssetHome}
          onRun={() => run(query)}
          onRunExample={(q) => {
            setQuery(q);
            run(q);
          }}
          onNetworkChange={setNetwork}
          onAnalyze={analyze}
        />
      ) : (
        <Workspace
          assets={[...ASSETS]}
          asset={asset}
          map={map}
          answer={answer}
          loading={loading}
          error={error}
          tab={tab}
          onTab={setTab}
          onSwitchAsset={switchAsset}
          onNewQuery={() => setView("home")}
        />
      )}
    </div>
  );
}
