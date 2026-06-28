import type { DistributionMap } from "@mantleflow/agent";
import { buildMapNodes, nodeStyle } from "../../../lib/derive";
import { SourceTag } from "../../SourceTag";

/**
 * Radial distribution map — center asset, edges to real venues / collateral / gate / verified bridge
 * routes. Trading venues, yield/vault positions and cross-chain channels are visually distinct; every
 * node carries the receipt for its underlying read. No fabricated routes — the cross-chain node(s)
 * reflect the actual computed reach.
 */
export function DistributionTab({ map }: { map: DistributionMap }) {
  const nodes = buildMapNodes(map);

  return (
    <div className="px-[34px] py-[30px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs tracking-[0.1em] text-mut">DISTRIBUTION MAP</span>
        <div className="flex flex-wrap gap-[18px] font-mono text-[11px] text-mut">
          <Legend swatch={<span className="block h-0 w-3 border-t-[3px] border-acid" />} label="TRADING" />
          <Legend swatch={<span className="block h-0 w-3 border-t-2 border-dashed border-acid" />} label="BRIDGE" />
          <Legend swatch={<span className="block h-0 w-3 border-t-2 border-dotted border-mut2" />} label="YIELD" />
          <Legend swatch={<span className="block h-0 w-3 border-t-2 border-dashed border-mut2" />} label="GATED" />
        </div>
      </div>

      <div className="relative h-[480px] border-2 border-line">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {nodes.map((n, i) => {
            const st = nodeStyle(n.status);
            return (
              <line
                key={`e${i}`}
                x1="50"
                y1="50"
                x2={n.x}
                y2={n.y}
                stroke={st.stroke}
                strokeWidth={st.width}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={st.dash}
                opacity={st.opacity}
              />
            );
          })}
          {nodes.map((n, i) => {
            const st = nodeStyle(n.status);
            if (!st.flow) return null;
            return (
              <line
                key={`f${i}`}
                x1="50"
                y1="50"
                x2={n.x}
                y2={n.y}
                stroke="#0A0A0A"
                strokeWidth={st.width}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="3 9"
                className="animate-dashmove"
              />
            );
          })}
        </svg>

        {/* center node */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border-2 border-acid bg-acid px-4 py-3 font-display text-[18px] font-extrabold text-ink">
          {map.asset.symbol}
        </div>

        {/* peripheral nodes */}
        {nodes.map((n, i) => {
          const st = nodeStyle(n.status);
          return (
            <div
              key={`n${i}`}
              className="absolute z-[2] flex w-[130px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <span
                className="flex h-[15px] w-[15px] items-center justify-center font-mono text-[11px] text-mut2"
                style={{ background: st.fill, border: st.border }}
              >
                {st.mark}
              </span>
              <span
                className={`text-[12px] font-bold leading-[1.15] ${
                  st.labelTone === "paper" ? "text-paper" : st.labelTone === "mut" ? "text-mut" : "text-mut2"
                }`}
              >
                {n.label}
              </span>
              <span className="flex items-center gap-1 font-mono text-[9.5px] text-mut2">
                {n.meta}
                {n.receipt ? <SourceTag receipt={n.receipt} label="" /> : null}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[11px] text-mut2">
        Nodes are real reads: trading venues (deep/thin by on-chain liquidity), yield/vault positions
        (not exit liquidity), Lendle collateral, the detected compliance gate, and verified cross-chain
        channels (LayerZero OFT / CCIP). Absences are findings — never fabricated routes.
      </p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  );
}
