import type { SourceReceipt } from "@mantleflow/agent";
import { fmtWhen } from "../lib/format";

const KIND_BADGE: Record<string, string> = {
  fact: "bg-acid text-ink",
  estimate: "border border-paper text-paper",
  assumption: "border border-mut text-mut",
};

/**
 * The accuracy proof attached to every displayed datum — a brutalist hover/focus popover showing
 * source, timestamp, kind, note and the corroborating URL. Accuracy is a judged axis, so this is a
 * feature, not decoration. Do NOT wrap this in an <a> (it renders its own link).
 */
export function SourceTag({ receipt, label = "SRC" }: { receipt: SourceReceipt; label?: string }) {
  return (
    <span className="group relative inline-block align-middle" tabIndex={0}>
      <span className="cursor-help select-none border border-line px-1 py-0.5 font-mono text-[9px] tracking-wider text-mut2 transition-colors group-hover:text-acid group-focus:text-acid">
        ⌖ {label}
      </span>
      <span className="invisible absolute left-0 top-full z-50 mt-1 w-64 border-2 border-paper bg-ink p-2 text-left font-mono text-[10px] leading-relaxed text-paper opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
        <span className={`inline-block px-1 py-0.5 uppercase ${KIND_BADGE[receipt.kind] ?? KIND_BADGE.assumption}`}>
          {receipt.kind}
        </span>{" "}
        <span className="text-paper">{receipt.sourceName}</span>
        <span className="mt-1 block text-mut">{fmtWhen(receipt.observedAt)} UTC</span>
        {receipt.note ? <span className="mt-1 block text-mut2">{receipt.note}</span> : null}
        {receipt.url ? (
          <a
            href={receipt.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-acid underline"
          >
            {receipt.url}
          </a>
        ) : null}
      </span>
    </span>
  );
}
