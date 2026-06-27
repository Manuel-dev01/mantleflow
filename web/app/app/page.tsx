"use client";

import { useState } from "react";
import Link from "next/link";
import type { DistributionMap } from "@mantleflow/agent";
import { getMap } from "../../lib/api";
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

  function pickAssetHome(sym: string) {
    setAsset(sym);
    setQuery(exampleFor(sym));
  }

  // RUN loads the asset's distribution map for FREE (no LLM). The natural-language AI deep-dive is
  // the x402-paid premium action inside the Overview tab. Resolve the asset from the query or chip.
  async function run(q: string) {
    const sym = ASSETS.find((s) => q.toLowerCase().includes(s.toLowerCase())) ?? asset;
    setLoading(true);
    setError(null);
    setView("workspace");
    setTab("overview");
    setAnswer(null);
    setAsset(sym);
    setRecent((r) => [{ q, t: "now" }, ...r].slice(0, 4));
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
      <div className="flex items-center justify-between border-b-2 border-paper px-[26px] py-3.5 font-mono">
        <div className="flex items-center gap-5">
          <span className="text-sm font-semibold tracking-[0.04em]">MANTLEFLOW</span>
          <span className="flex items-center gap-1.5 text-[11px] text-mut">
            <span className="h-[7px] w-[7px] bg-acid" />
            LIVE · MANTLE L2
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AgentIdentity />
          <Link
            href="/"
            className="border-2 border-paper bg-transparent px-3.5 py-2 font-mono text-[11px] tracking-[0.04em] text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            ← EXIT TO SITE
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
          onQueryChange={setQuery}
          onPickAsset={pickAssetHome}
          onRun={() => run(query)}
          onRunExample={(q) => {
            setQuery(q);
            run(q);
          }}
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
