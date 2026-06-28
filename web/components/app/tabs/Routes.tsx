import type { DistributionMap } from "@mantleflow/agent";
import { routesOf } from "../../../lib/derive";
import { SourceTag } from "../../SourceTag";

/**
 * Cross-chain exit routes — real, verified reach OFF Mantle: LayerZero OFT (on-chain endpoint probe)
 * and Chainlink CCIP membership. Negative results are shown too (an absence is a distribution
 * finding). Per-tx bridge fees are dynamic, so cost is honestly "not quoted" — never fabricated.
 */
export function RoutesTab({ map }: { map: DistributionMap }) {
  const { routes, status, explanation } = routesOf(map);

  return (
    <div className="px-[34px] py-[30px]">
      <div className="mb-1 flex items-end justify-between">
        <span className="font-mono text-xs tracking-[0.1em] text-mut">CROSS-CHAIN EXIT ROUTES</span>
        <span
          className={`font-mono text-[11px] ${
            status === "computed" ? "text-acid" : "text-mut2"
          }`}
        >
          {status === "computed" ? "ROUTE VERIFIED" : "NO ROUTE VERIFIED"}
        </span>
      </div>
      <p className="m-0 mb-6 max-w-[640px] text-sm leading-[1.6] text-mut">{explanation}</p>

      {/* When we probed both channels and none is available, that's a finding — frame it as one. */}
      {routes.length > 0 && status !== "computed" ? (
        <div className="mb-6 border-2 border-acid bg-acid/5 px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.1em] text-acid">FINDING · NO PERMISSIONLESS BRIDGE</div>
          <p className="m-0 mt-1 max-w-[640px] text-sm leading-[1.5] text-paper">
            This RWA has no verified permissionless cross-chain route — it exits Mantle via a LayerZero
            OFT or not at all. A structural distribution gap, surfaced from two independent sources below.
          </p>
        </div>
      ) : null}

      {routes.length === 0 ? (
        <div className="border-2 border-dashed border-line p-8 font-mono text-[11px] text-mut2">
          Cross-chain reach could not be sourced this run (transient) — we never imply a value we have
          not sourced.
        </div>
      ) : (
        <div className="grid gap-0 border-2 border-paper md:grid-cols-3">
          {routes.map((r, i) => (
            <div
              key={r.protocol}
              className={`flex min-h-[150px] flex-col gap-2 border-paper p-5 ${
                i < routes.length - 1 ? "border-b-2 md:border-b-0 md:border-r-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[17px] font-bold uppercase tracking-[-0.01em]">
                  {r.protocol}
                </span>
                <span
                  className={`h-2.5 w-2.5 ${r.available ? "bg-acid" : "border border-mut2"}`}
                  title={r.available ? "available" : "not available"}
                />
              </div>
              <div
                className={`font-mono text-[10px] uppercase tracking-[0.06em] ${
                  r.available ? "text-acid" : "text-mut2"
                }`}
              >
                {r.available ? "available" : "not available"}
              </div>
              <p className="m-0 text-[13px] leading-[1.5] text-mut">{r.detail}</p>
              {r.destinations.length > 0 ? (
                <div className="font-mono text-[10px] text-mut2">→ {r.destinations.join(", ")}</div>
              ) : null}
              <div className="mt-auto flex items-center justify-between font-mono text-[10px] text-mut2">
                <span>cost: {r.costUsd != null ? `$${r.costUsd}` : "not quoted"}</span>
                <SourceTag receipt={r.receipt} label="" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] leading-[1.7] text-mut2">
        Verified on-chain (LayerZero V2 endpoint probe) + Chainlink CCIP directory. Issuer-specific
        bridges we don’t probe aren’t claimed either way. Bridge fees are per-tx dynamic — not quoted.
      </p>
    </div>
  );
}
