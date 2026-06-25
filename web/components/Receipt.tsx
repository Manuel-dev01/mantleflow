import type { SourceReceipt } from "@mantleflow/agent";

const KIND_STYLE: Record<string, string> = {
  fact: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  estimate: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  assumption: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

/** Renders a single source receipt — the accuracy proof attached to every datum. */
export function Receipt({ receipt }: { receipt: SourceReceipt }) {
  const when = new Date(receipt.observedAt).toISOString().slice(0, 16).replace("T", " ");
  const inner = (
    <span
      title={receipt.note ?? undefined}
      className="inline-flex items-center gap-1.5 text-[11px] leading-tight"
    >
      <span
        className={`rounded border px-1.5 py-0.5 uppercase tracking-wide ${
          KIND_STYLE[receipt.kind] ?? KIND_STYLE.assumption
        }`}
      >
        {receipt.kind}
      </span>
      <span className="text-zinc-300">{receipt.sourceName}</span>
      <span className="text-zinc-500">· {when} UTC</span>
    </span>
  );
  return receipt.url ? (
    <a href={receipt.url} target="_blank" rel="noreferrer" className="hover:underline">
      {inner}
    </a>
  ) : (
    inner
  );
}
