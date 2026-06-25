/**
 * SourceReceipt — the accuracy invariant of MantleFlow.
 *
 * Every externally-sourced datum (an on-chain read, an API figure, an oracle price)
 * MUST be wrapped in a SourceReceipt so the UI and the research writeup can show a
 * judge exactly where a number came from, when, and whether it is a hard fact, an
 * estimate, or a working assumption. No number ships without one. See docs/DECISIONS.md #5.
 */

/** Whether a value is a hard fact, a computed/derived estimate, or an unproven assumption. */
export type DatumKind = "fact" | "estimate" | "assumption";

export interface SourceReceipt {
  /** Human-readable source, e.g. "Mantle RPC eth_call", "DefiLlama", "Mantlescan API". */
  sourceName: string;
  /** A URL a judge can open to corroborate: explorer page, API endpoint, doc, tx hash link. */
  url: string;
  /** ISO-8601 timestamp of when the value was observed/fetched. */
  observedAt: string;
  kind: DatumKind;
  /** Optional note: methodology, caveat, or the exact call made. */
  note?: string;
}

/** A value paired with its provenance. The core unit the whole pipeline passes around. */
export interface Sourced<T> {
  value: T;
  receipt: SourceReceipt;
}

export function sourced<T>(value: T, receipt: SourceReceipt): Sourced<T> {
  return { value, receipt };
}

/** Convenience builder for an on-chain read receipt against a Mantle explorer. */
export function onchainReceipt(params: {
  explorerBase: string;
  address: string;
  call: string;
  observedAt: string;
  kind?: DatumKind;
}): SourceReceipt {
  return {
    sourceName: "Mantle RPC (eth_call)",
    url: `${params.explorerBase}/address/${params.address}`,
    observedAt: params.observedAt,
    kind: params.kind ?? "fact",
    note: `eth_call ${params.call} on ${params.address}`,
  };
}
