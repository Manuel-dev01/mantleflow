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

/** ISO timestamp → `YYYY-MM-DD HH:MM`. */
export function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return iso;
  }
}
