/** Compact USD formatting for the brutalist stat displays. */
export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n) || n <= 0) return "$0";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

/** Percent formatting; `null` → an em dash so we never imply a number we don't have. */
export function fmtPct(n: number | null | undefined, dp = 2): string {
  return n == null || !isFinite(n) ? "—" : `${n.toFixed(dp)}%`;
}

/** Humanized token supply from a raw integer string + decimals (e.g. "1.35M", "28.7K"). */
export function fmtSupply(raw: string | null, decimals: number | null): string {
  if (raw == null) return "—";
  const d = decimals ?? 18;
  const n = Number(raw) / 10 ** d;
  if (!isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

/** ISO timestamp → `YYYY-MM-DD HH:MM`. */
export function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return iso;
  }
}
