/**
 * Cross-chain exit routes are a Phase-4 capability (CCIP / bridge lane availability + cost). Rather
 * than fabricate routes — as the original mockup did — we render an honest not-yet-computed state.
 */
export function RoutesTab() {
  return (
    <div className="px-[34px] py-[30px]">
      <span className="font-mono text-xs tracking-[0.1em] text-mut">CROSS-CHAIN EXIT ROUTES</span>
      <div className="mt-6 border-2 border-dashed border-line p-10">
        <div className="mb-3 inline-block border-2 border-mut2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-mut2">
          Not yet computed · Phase 4
        </div>
        <h3 className="m-0 mb-3 max-w-[620px] font-display text-[clamp(22px,3vw,34px)] font-bold uppercase leading-[1.05]">
          We don’t guess bridges.
        </h3>
        <p className="m-0 max-w-[600px] text-sm leading-[1.6] text-mut">
          Cross-chain reach — which CCIP / canonical-bridge lanes exist and the estimated cost and slippage
          to exit a position to another chain — is the next module on the roadmap. Until it reads real lane
          availability on-chain, this panel stays empty on purpose: an unsourced route is worse than no
          route. Reachability, depth, borrowability and compliance above are all live now.
        </p>
      </div>
    </div>
  );
}
