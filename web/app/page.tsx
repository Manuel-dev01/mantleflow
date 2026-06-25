"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { DistributionMap } from "@mantleflow/agent";
import { DistributionMapPanel } from "../components/DistributionMapPanel";

const EXAMPLE =
  "I hold $1M of MI4 — where can I exit it, what can I borrow against it, and am I gated?";

interface ApiResult {
  answer?: string;
  map?: DistributionMap;
  toolCalls?: { name: string }[];
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState(EXAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

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
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-edge bg-ink p-3 text-sm text-zinc-100 outline-none focus:border-accent"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={run}
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {loading ? "Researching…" : "Run distribution analysis"}
          </button>
          <button
            onClick={() => setQuery(EXAMPLE)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            reset to example
          </button>
        </div>
      </div>

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
