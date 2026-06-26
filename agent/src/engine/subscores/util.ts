/** Compact USD formatting for explanations, e.g. 12_345_678 → "$12.3M". */
export function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Liquidity → 0..100 band (documented, explainable). */
export function liquidityBand(usd: number): number {
  if (usd <= 0) return 0;
  if (usd < 10_000) return 10;
  if (usd < 100_000) return 30;
  if (usd < 1_000_000) return 55;
  if (usd < 10_000_000) return 80;
  return 95;
}
