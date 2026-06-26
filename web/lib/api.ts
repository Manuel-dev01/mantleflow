import type { DistributionMap } from "@mantleflow/agent";

export interface QueryResponse {
  answer?: string;
  map?: DistributionMap;
  toolCalls?: { name: string }[];
  error?: string;
}

/** Full NL query → LLM answer + structured map (slower; runs the orchestrator). */
export async function runQuery(query: string): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return (await res.json()) as QueryResponse;
}

/** Just the distribution map for one asset — no LLM, fast (workspace asset/tab switching). */
export async function getMap(symbol: string): Promise<{ map?: DistributionMap; error?: string }> {
  const res = await fetch(`/api/map?symbol=${encodeURIComponent(symbol)}`);
  return (await res.json()) as { map?: DistributionMap; error?: string };
}
