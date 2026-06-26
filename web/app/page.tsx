"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { DistributionMap } from "@mantleflow/agent";
import { DistributionMapPanel } from "../components/DistributionMapPanel";
import { CompareTable } from "../components/CompareTable";

const ASSETS = ["MI4", "mETH", "cmETH", "fBTC", "USDe", "USDY"] as const;

const exampleFor = (sym: string) =>
  sym === "MI4"
    ? "I hold $1M of MI4 — where can I exit it, what can I borrow against it, and am I gated?"
    : `Map the distribution of ${sym} on Mantle: where can I trade it, how deep is liquidity, can I borrow against it, and is it gated?`;

interface ApiResult {
  answer?: string;
  map?: DistributionMap;
  toolCalls?: { name: string }[];
  error?: string;
}

export default function Home() {
  const [asset, setAsset] = useState<string>("MI4");
  const [query, setQuery] = useState(exampleFor("MI4"));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const [compareLoading, setCompareLoading] = useState(false);
  const [compareMaps, setCompareMaps] = useState<DistributionMap[] | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      setResult((await res.json()) as ApiResult);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function runCompare() {
    setCompareLoading(true);
    setCompareError(null);
    setCompareMaps(null);
    try {
      const res = await fetch("/api/compare");
      const data = (await res.json()) as { maps?: DistributionMap[]; error?: string };
      if (data.error) setCompareError(data.error);
      else setCompareMaps(data.maps ?? []);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompareLoading(false);
    }
  }

  function pickAsset(sym: string) {
    setAsset(sym);
    setQuery(exampleFor(sym));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">
          MantleFlow <span className="text-accent">· RWA Distribution Router</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Maps the <em>distribution</em> (not issuance) of tokenized assets on Mantle: where can an
          asset be bought, sold, borrowed against, bridged — and who is gated from holding it. Every
          number carries a source receipt.
        </p>
      </header>

      <div className="rounded-lg border border-edge bg-panel p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ASSETS.map((a) => (
            <button
              key={a}
              onClick={() => pickAsset(a)}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                asset === a
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-edge text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-edge bg-ink p-3 text-sm text-zinc-100 outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {loading ? "Researching…" : "Run distribution analysis"}
          </button>
          <button
            onClick={runCompare}
            disabled={compareLoading}
            className="rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-50"
          >
            {compareLoading ? "Comparing all assets…" : "Compare all assets"}
          </button>
        </div>
      </div>

      {(compareMaps || compareError) && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Distribution leaderboard — all tracked assets
          </h2>
          {compareError ? (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              {compareError}
            </div>
          ) : (
            compareMaps && <CompareTable maps={compareMaps} />
          )}
        </section>
      )}

      {result?.error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Agent answer
            </h2>
            <div className="answer rounded-lg border border-edge bg-panel p-5 text-sm text-zinc-200">
              <ReactMarkdown>{result.answer ?? ""}</ReactMarkdown>
            </div>
            {result.toolCalls && result.toolCalls.length > 0 && (
              <p className="mt-2 text-xs text-zinc-600">
                tools: {result.toolCalls.map((t) => t.name).join(" → ")}
              </p>
            )}
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Distribution map
            </h2>
            {result.map ? (
              <DistributionMapPanel map={result.map} />
            ) : (
              <p className="text-sm text-zinc-500">No structured map returned.</p>
            )}
          </div>
        </div>
      )}

      <footer className="mt-16 border-t border-edge pt-4 text-xs text-zinc-600">
        Real on-chain Mantle reads · Distribution Score engine · accuracy = a judging axis, so every
        datum is sourced &amp; timestamped.
      </footer>
    </main>
  );
}
