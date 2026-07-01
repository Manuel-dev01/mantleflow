"use client";

import type { Network } from "./api";

/**
 * Persisted "recently analyzed" assets — the arbitrary tokens a visitor has looked up, kept in
 * localStorage so they survive a reload (per-browser; no account needed). Featured chips are always
 * available; this remembers the off-list assets the user explored.
 */
export interface AnalyzedAsset {
  address: string;
  symbol: string;
  network: Network;
  at: number;
}

const KEY = "mantleflow:recent-assets";
const CAP = 12;

export function getRecentAssets(): AnalyzedAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as AnalyzedAsset[]) : [];
    return Array.isArray(list) ? list.filter((a) => a && typeof a.address === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentAsset(a: Omit<AnalyzedAsset, "at">): AnalyzedAsset[] {
  if (typeof window === "undefined") return [];
  const rest = getRecentAssets().filter(
    (x) => !(x.address.toLowerCase() === a.address.toLowerCase() && x.network === a.network),
  );
  const next = [{ ...a, at: Date.now() }, ...rest].slice(0, CAP);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — the list just won't persist */
  }
  return next;
}

export function clearRecentAssets(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
