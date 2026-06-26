import type { DistributionMap } from "@mantleflow/agent";
import { liquidityOf, subOf } from "../../../lib/derive";
import { fmtUsd, fmtPct } from "../../../lib/format";
import { SourceTag } from "../../SourceTag";

const BAR_COLORS = ["#C8F24E", "#F3F3EE", "#F3F3EE", "#9A9A93", "#9A9A93", "#6F6F68"];

/** Liquidity depth + fragmentation from real per-venue reads (USD share, depth±2%, $250k slip). */
export function LiquidityTab({ map }: { map: DistributionMap }) {
  const venues = [...liquidityOf(map)].sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  const total = venues.reduce((s, v) => s + v.liquidityUsd, 0);
  const frag = subOf(map, "fragmentation");

  if (venues.length === 0) {
    return (
      <div className="px-[34px] py-[30px]">
        <span className="font-mono text-xs tracking-[0.1em] text-mut">LIQUIDITY DEPTH & FRAGMENTATION</span>
        <p className="mt-4 max-w-[600px] text-sm text-mut">
          No measurable secondary liquidity on Mantle — there is no on-chain venue to size. That absence is
          itself the finding (see the Distribution tab): exit is via issuer redemption, not the open market.
        </p>
      </div>
    );
  }

  return (
    <div className="px-[34px] py-[30px]">
      <div className="mb-1.5 flex items-end justify-between">
        <span className="font-mono text-xs tracking-[0.1em] text-mut">LIQUIDITY DEPTH & FRAGMENTATION</span>
        <div className="text-right">
          <div className="font-display text-[32px] font-extrabold">{fmtUsd(total)}</div>
          <div className="font-mono text-[10px] text-mut">
            TOTAL SECONDARY · {venues.length} VENUE{venues.length === 1 ? "" : "S"}
          </div>
        </div>
      </div>
      <p className="m-0 mb-6 max-w-[640px] text-sm text-mut">
        {frag?.explanation ?? "Share, depth and $250k clearing slippage per venue."}
      </p>

      <div className="flex flex-col">
        {venues.map((v, i) => {
          const share = total > 0 ? (v.liquidityUsd / total) * 100 : 0;
          const color = BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)];
          return (
            <div
              key={v.venue + i}
              className="grid grid-cols-[150px_1fr_84px_70px] items-center gap-3 border-b-2 border-line py-3.5 md:grid-cols-[180px_1fr_100px_80px] md:gap-4"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-2.5 w-2.5 shrink-0" style={{ background: color }} />
                <span className="truncate text-sm font-semibold">{v.venue}</span>
              </div>
              <div className="h-3 border-2 border-line">
                <div className="h-full" style={{ width: `${share}%`, background: color }} />
              </div>
              <span className="flex items-center justify-end gap-1 text-right font-mono text-xs">
                {fmtUsd(v.liquidityUsd)} <SourceTag receipt={v.receipt} label="" />
              </span>
              <span
                className={`text-right font-mono text-xs ${
                  v.slipPctAt250k == null ? "text-mut2" : v.slipPctAt250k < 1 ? "text-acid" : "text-paper"
                }`}
              >
                {fmtPct(v.slipPctAt250k)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-[150px_1fr_84px_70px] gap-3 font-mono text-[10px] text-mut2 md:grid-cols-[180px_1fr_100px_80px] md:gap-4">
        <span>VENUE</span>
        <span>SHARE</span>
        <span className="text-right">LIQUIDITY</span>
        <span className="text-right">SLIP/250K</span>
      </div>
      <p className="mt-4 font-mono text-[10px] text-mut2">
        “SLIP/250K” is exact constant-product price impact on CPMM pairs; TVL-proxy venues (v3 / Liquidity
        Book) show “—” rather than an unsourced slippage.
      </p>
    </div>
  );
}
