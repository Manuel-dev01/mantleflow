import type { DistributionMap } from "@mantleflow/agent";
import { liquidityOf, subOf } from "../../../lib/derive";
import { fmtUsd, fmtPct } from "../../../lib/format";
import { SourceTag } from "../../SourceTag";

const BAR_COLORS = ["#C8F24E", "#F3F3EE", "#F3F3EE", "#9A9A93", "#9A9A93", "#6F6F68"];

/** Liquidity depth + fragmentation from real per-venue reads (USD share, depth±2%, $250k slip).
 * Genuine TRADING venues are sized and counted; single-asset YIELD/vault positions are listed
 * separately and explicitly NOT counted as exit liquidity. */
export function LiquidityTab({ map }: { map: DistributionMap }) {
  const all = [...liquidityOf(map)].sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  const swap = all.filter((v) => v.venueType === "swap");
  const yieldV = all.filter((v) => v.venueType === "yield");
  const total = swap.reduce((s, v) => s + v.liquidityUsd, 0);
  const frag = subOf(map, "fragmentation");

  return (
    <div className="px-[34px] py-[30px]">
      <div className="mb-1.5 flex items-end justify-between">
        <span className="font-mono text-xs tracking-[0.1em] text-mut">LIQUIDITY DEPTH & FRAGMENTATION</span>
        <div className="text-right">
          <div className="font-display text-[32px] font-extrabold">{swap.length ? fmtUsd(total) : "—"}</div>
          <div className="font-mono text-[10px] text-mut">
            TRADING · {swap.length} VENUE{swap.length === 1 ? "" : "S"}
          </div>
        </div>
      </div>

      {swap.length === 0 ? (
        <p className="m-0 mb-6 max-w-[640px] text-sm text-mut">
          No genuine secondary TRADING venue on Mantle (via probed venues) — there is no AMM/DEX book to
          size. That absence is itself the finding (see the Distribution tab): exit is via issuer
          redemption, not the open market.{yieldV.length ? " Single-asset yield/vault positions exist but are not exit liquidity — listed below." : ""}
        </p>
      ) : (
        <>
          <p className="m-0 mb-6 max-w-[640px] text-sm text-mut">
            {frag?.explanation ?? "Share, depth and $250k clearing slippage per venue."}
          </p>
          <div className="flex flex-col">
            {swap.map((v, i) => {
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
            “SLIP/250K” is exact constant-product price impact on CPMM pairs; TVL-proxy venues (v3 /
            Liquidity Book) show “—” rather than an unsourced slippage.
          </p>
        </>
      )}

      {/* Yield / vault positions — informational; NOT counted toward tradeable depth. */}
      {yieldV.length > 0 ? (
        <div className="mt-8">
          <div className="mb-2 font-mono text-[11px] tracking-[0.1em] text-mut">
            YIELD / VAULT POSITIONS · INFORMATIONAL (NOT EXIT LIQUIDITY)
          </div>
          <div className="border-t-2 border-line">
            {yieldV.map((v, i) => (
              <div key={v.venue + i} className="flex items-center justify-between gap-3 border-b-2 border-line py-3">
                <span className="truncate text-sm text-mut">{v.venue}</span>
                <span className="flex items-center gap-1 font-mono text-xs text-mut2">
                  {fmtUsd(v.liquidityUsd)} TVL <SourceTag receipt={v.receipt} label="" />
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-[1.6] text-mut2">
            Single-asset deposits (lending / staking / vaults). You cannot sell into them, so they are
            not counted as secondary trading depth — shown for completeness.
          </p>
        </div>
      ) : null}
    </div>
  );
}
