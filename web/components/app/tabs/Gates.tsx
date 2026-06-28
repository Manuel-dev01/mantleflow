import type { DistributionMap } from "@mantleflow/agent";
import { complianceOf, borrowOf } from "../../../lib/derive";
import { SourceTag } from "../../SourceTag";

/**
 * Compliance gates — the REAL on-chain mechanism (Securitize allowlist, ERC-1404, etc.), the gate
 * status, and the evidence with receipts. We deliberately DO NOT render a US/EU/UK jurisdiction table
 * (the original mockup's invention): jurisdiction can't be source-verified from the contract, so we
 * report the mechanism, not a guessed map.
 */
export function GatesTab({ map }: { map: DistributionMap }) {
  const c = complianceOf(map);
  const borrow = borrowOf(map);

  if (!c) {
    return (
      <div className="px-[34px] py-[30px]">
        <span className="font-mono text-xs tracking-[0.1em] text-mut">COMPLIANCE GATES · WHO CAN HOLD</span>
        <p className="mt-4 text-sm text-mut">No compliance sub-score available.</p>
      </div>
    );
  }

  const statusLabel = !c.determined
    ? "INSUFFICIENT DATA"
    : c.tier === "permissioned"
      ? "GATED"
      : c.tier === "restrictable"
        ? "BLOCKABLE"
        : "FREELY TRANSFERABLE";
  const statusTone = !c.determined ? "text-mut" : c.tier === "open" ? "text-acid" : "text-paper";

  return (
    <div className="px-[34px] py-[30px]">
      <span className="font-mono text-xs tracking-[0.1em] text-mut">COMPLIANCE GATES · WHO CAN HOLD</span>

      <div className="mt-5 border-2 border-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-paper px-5 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-mut">STATUS</span>
            <span className={`font-display text-[26px] font-extrabold uppercase ${statusTone}`}>{statusLabel}</span>
          </div>
          {c.mechanism ? (
            <span className="font-mono text-xs text-mut">MECHANISM · {c.mechanism}</span>
          ) : null}
        </div>
        <p className="m-0 px-5 py-4 text-[15px] leading-[1.55] text-paper">{c.explanation}</p>
      </div>

      {/* Evidence — each detected signal with its receipt. */}
      {c.evidence.length > 0 ? (
        <div className="mt-6">
          <div className="mb-2.5 font-mono text-[11px] tracking-[0.1em] text-mut">ON-CHAIN EVIDENCE</div>
          <div className="border-t-2 border-line">
            {c.evidence.map((e, i) => (
              <div key={i} className="flex items-start gap-3 border-b-2 border-line py-3.5">
                <span className="mt-0.5 font-mono text-mut2">›</span>
                <span className="flex-1 text-sm text-paper">{String(e.value)}</span>
                {e.receipt ? <SourceTag receipt={e.receipt} /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Borrow-side gate note (frozen reserves are a holding-adjacent restriction). */}
      {borrow?.value.isFrozen ? (
        <p className="mt-5 border-2 border-line px-4 py-3 font-mono text-xs text-mut">
          ⚠ Lendle reserve is FROZEN — supply/borrow against this asset is currently halted.
        </p>
      ) : null}

      <p className="mt-6 max-w-[640px] font-mono text-[10px] leading-[1.7] text-mut2">
        Jurisdiction-level breakdown (US / EU / UK …) is intentionally omitted: it cannot be source-verified
        from the token contract. We detect and report the on-chain gating mechanism — the thing that
        actually decides who can hold or receive the asset — not a guessed jurisdiction map.
      </p>
    </div>
  );
}
