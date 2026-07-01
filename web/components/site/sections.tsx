import Link from "next/link";
import type { DistributionMap } from "@mantleflow/agent";
import { overviewStats } from "../../lib/derive";
import { SourceTag } from "../SourceTag";

// Shared brutalist CTA - acid fill, hover inverts to ink/acid.
export function LaunchCTA({ size = "md", label = "LAUNCH APP →" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const pad =
    size === "lg"
      ? "px-5 py-3.5 text-sm sm:px-7 sm:py-4 sm:text-[15px]"
      : size === "sm"
        ? "px-4 py-2.5 text-xs"
        : "px-6 py-4 text-sm";
  return (
    <Link
      href="/app"
      className={`inline-block border-2 border-acid bg-acid font-mono font-semibold tracking-[0.04em] text-ink transition-colors hover:bg-ink hover:text-acid ${pad}`}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b-2 border-paper bg-ink px-6 py-4 font-mono md:px-[34px]">
      <span className="text-[15px] font-semibold tracking-[0.04em]">MANTLEFLOW</span>
      <div className="flex items-center gap-5 text-xs text-mut md:gap-[30px]">
        <a href="#product" className="hidden transition-colors hover:text-paper sm:inline">PRODUCT</a>
        <a href="#thesis" className="hidden transition-colors hover:text-paper sm:inline">THESIS</a>
        <a href="#venues" className="hidden transition-colors hover:text-paper sm:inline">VENUES</a>
        <LaunchCTA size="sm" />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <div className="relative overflow-hidden border-b-2 border-paper px-6 pb-14 pt-20 md:px-[34px]">
      <div className="mb-[30px] font-mono text-xs tracking-[0.18em] text-acid">
        RESEARCH AGENT · RWA DISTRIBUTION ON MANTLE
      </div>
      <h1 className="m-0 font-display text-[clamp(38px,11vw,164px)] font-extrabold uppercase leading-[0.84] tracking-[-0.035em]">
        Issuance
        <br />
        is easy.
        <br />
        <span className="bg-acid px-2.5 text-ink sm:px-3.5">Distribution</span>
        <br />
        isn’t.
      </h1>
      <div className="mt-12 flex flex-wrap items-end justify-between gap-10">
        <p className="m-0 max-w-[600px] text-[19px] leading-[1.5] text-paper">
          mantleflow is the research agent that maps where any tokenized asset on Mantle can{" "}
          <span className="bg-acid px-1 text-ink">actually go</span> - every venue it trades on, every
          market that lends against it, every bridge out, and exactly who is walled out from holding it.
        </p>
        <div className="flex gap-3.5">
          <LaunchCTA size="lg" />
          <a
            href="#thesis"
            className="inline-block border-2 border-paper bg-transparent px-5 py-3.5 font-mono text-sm font-semibold tracking-[0.04em] text-paper transition-colors hover:bg-paper hover:text-ink sm:px-7 sm:py-4 sm:text-[15px]"
          >
            THE THESIS
          </a>
        </div>
      </div>
    </div>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden whitespace-nowrap border-b-2 border-paper bg-acid">
      <div className="inline-flex animate-marquee font-mono text-sm font-semibold text-ink">
        <span className="py-3">
          {loop.map((t, i) => (
            <span key={i} className="border-r border-ink/20 px-[26px]">
              {t}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

const THESIS = [
  { num: "R-01", title: "Reachability", body: "An asset can exist and still be unreachable. We trace every secondary venue it actually trades on - not where it was minted.", tag: "WHERE CAN IT BE BOUGHT & SOLD" },
  { num: "L-02", title: "Liquidity", body: "Depth and fragmentation decide real exit cost. We surface slippage per venue and where the book is dangerously thin.", tag: "HOW DEEP, HOW SPLIT" },
  { num: "C-03", title: "Compliance", body: "Whitelists and transfer-agent gates quietly wall off holders. We detect the on-chain mechanism that decides who can hold it.", tag: "WHO IS GATED OUT" },
];

export function Thesis() {
  return (
    <div id="thesis" className="scroll-mt-20 border-b-2 border-paper px-6 py-24 md:px-[34px]">
      <div className="mb-[30px] font-mono text-xs tracking-[0.16em] text-mut">§01 - THE THESIS</div>
      <h2 className="m-0 mb-16 max-w-[1100px] font-display text-[clamp(30px,5.2vw,68px)] font-bold uppercase leading-[0.95] tracking-[-0.02em]">
        Anyone can mint an asset. The market is everywhere it goes <span className="text-acid">next.</span>
      </h2>
      <div className="grid border-2 border-paper md:grid-cols-3">
        {THESIS.map((c, i) => (
          <div
            key={c.num}
            className={`group flex min-h-[240px] flex-col gap-3.5 border-paper px-[26px] pb-[34px] pt-[30px] transition-colors hover:bg-acid hover:text-ink ${i < 2 ? "border-b-2 md:border-b-0 md:border-r-2" : ""}`}
          >
            <span className="font-mono text-xs text-mut group-hover:text-ink">{c.num}</span>
            <h3 className="m-0 font-display text-[26px] font-bold uppercase tracking-[-0.01em]">{c.title}</h3>
            <p className="m-0 text-[15px] leading-[1.5] text-mut group-hover:text-ink">{c.body}</p>
            <span className="mt-auto font-mono text-[11px] tracking-[0.04em]">{c.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAPABILITIES = [
  { num: "01", title: "Ask", body: "Plain-language questions about any Mantle RWA. No query language, no dashboards." },
  { num: "02", title: "Distribution", body: "Every venue, lending market and bridge the asset can actually reach." },
  { num: "03", title: "Liquidity", body: "Depth, fragmentation and real slippage on a size that matters." },
  { num: "04", title: "Routes", body: "Cross-chain exits - cost, time and the hops in between." },
  { num: "05", title: "Gates", body: "Transfer-agent and whitelist walls. The mechanism that decides who can hold it." },
];

export function HowItWorks() {
  return (
    <div id="venues" className="scroll-mt-20 border-b-2 border-paper px-6 py-24 md:px-[34px]">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-[30px]">
        <div>
          <div className="mb-[30px] font-mono text-xs tracking-[0.16em] text-mut">§02 - HOW IT WORKS</div>
          <h2 className="m-0 font-display text-[clamp(30px,5.2vw,68px)] font-bold uppercase leading-[0.9] tracking-[-0.02em]">
            One question in.
            <br />
            The whole map out.
          </h2>
        </div>
        <p className="m-0 max-w-[320px] text-[15px] leading-[1.55] text-mut">
          Ask in plain language. mantleflow returns the concrete frictions between issuance and a global
          book - not a block-explorer dump.
        </p>
      </div>
      <div className="grid border-2 border-paper sm:grid-cols-2 lg:grid-cols-5">
        {CAPABILITIES.map((m, i) => (
          <div
            key={m.num}
            className="group flex min-h-[200px] flex-col gap-3 border-b-2 border-paper px-[18px] pb-7 pt-6 transition-colors last:border-b-0 hover:bg-acid hover:text-ink lg:border-b-0 lg:border-r-2 lg:last:border-r-0"
          >
            <span className="font-mono text-xs text-mut group-hover:text-ink">{m.num}</span>
            <h3 className="m-0 font-display text-[19px] font-extrabold uppercase">{m.title}</h3>
            <p className="m-0 text-[13px] leading-[1.5] text-mut group-hover:text-ink">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Live product preview - real data for one asset, or an honest "unavailable" shell. */
export function ProductPreview({ map }: { map: DistributionMap | null }) {
  return (
    <div id="product" className="scroll-mt-20 border-b-2 border-paper px-6 py-24 md:px-[34px]">
      <div className="mb-[30px] font-mono text-xs tracking-[0.16em] text-mut">§03 - SEE IT WORK · LIVE</div>
      <div className="border-2 border-paper">
        <div className="flex items-center justify-between border-b-2 border-paper px-[18px] py-3 font-mono text-xs">
          <span className="font-semibold">MANTLEFLOW / WORKSPACE</span>
          <span className="text-mut">{map ? `${map.asset.symbol} · ${map.asset.name}` : "LIVE READ UNAVAILABLE"}</span>
        </div>
        {map ? <PreviewBody map={map} /> : <PreviewUnavailable />}
        <div className="flex justify-center border-t-2 border-paper p-[18px]">
          <LaunchCTA label="OPEN THE FULL APP →" />
        </div>
      </div>
    </div>
  );
}

function PreviewBody({ map }: { map: DistributionMap }) {
  const s = overviewStats(map);
  const cells = [
    { k: "VENUES", v: s.venues.value, tone: s.venues.tone, receipt: s.venues.receipt },
    { k: "DEPTH", v: s.depth.value, tone: s.depth.tone, receipt: s.depth.receipt },
    { k: "BEST SLIP", v: s.bestSlip.value, tone: s.bestSlip.tone, receipt: s.bestSlip.receipt },
    { k: "HOLDING", v: s.holding.value, tone: s.holding.tone, receipt: s.holding.receipt },
  ];
  return (
    <div className="grid md:grid-cols-[1.5fr_1fr]">
      <div className="border-b-2 border-paper p-[34px] md:border-b-0 md:border-r-2">
        <div className="mb-4 font-mono text-[11px] tracking-[0.1em] text-acid">› AGENT ANSWER</div>
        <p className="m-0 text-[19px] leading-[1.5] text-paper">
          {map.headlines.slice(0, 2).join(". ")}.
          <span className="text-mut">
            {" "}
            {map.composite != null ? ` Composite ${map.composite}/100 (${map.compositeNote}).` : ""}
          </span>
        </p>
      </div>
      <div className="grid grid-cols-2">
        {cells.map((c, i) => (
          <div
            key={c.k}
            className={`p-6 ${i % 2 === 0 ? "border-r-2" : ""} ${i < 2 ? "border-b-2" : ""} border-line`}
          >
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-mut">
              {c.k} {c.receipt ? <SourceTag receipt={c.receipt} /> : null}
            </div>
            <div
              className={`mt-2 font-display text-[clamp(22px,4vw,40px)] font-extrabold leading-none ${
                c.tone === "acid" ? "text-acid" : c.tone === "mut" ? "text-mut" : "text-paper"
              }`}
            >
              {c.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewUnavailable() {
  return (
    <div className="p-[34px]">
      <div className="mb-4 font-mono text-[11px] tracking-[0.1em] text-mut">› LIVE READ UNAVAILABLE</div>
      <p className="m-0 max-w-[520px] text-[17px] leading-[1.5] text-mut">
        The live on-chain preview couldn’t be sourced right now - rather than show a fabricated number,
        we show nothing. Open the full app to run a fresh distribution analysis.
      </p>
    </div>
  );
}

export function StatBand({ stats }: { stats: { v: string; k: string }[] }) {
  return (
    <div className="border-b-2 border-paper bg-paper px-6 py-20 text-ink md:px-[34px]">
      <div className="grid gap-0 md:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={s.k}
            className={`${i < 2 ? "border-b-2 pb-6 md:border-b-0 md:border-r-2 md:pb-0" : ""} ${i > 0 ? "md:pl-6" : ""} border-ink ${i < 2 ? "md:pr-6" : ""}`}
          >
            <div className="font-display text-[clamp(48px,9vw,120px)] font-extrabold leading-[0.9]">{s.v}</div>
            <div className="mt-2 font-mono text-[13px]">{s.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STACK = [
  { num: "01", title: "ERC-8004 Identity", body: "The agent holds an on-chain identity (ERC-721 agentId) on Mantle and writes tamper-evident provenance receipts committing to each result." },
  { num: "02", title: "MCP Server", body: "Every capability is exposed over the Model Context Protocol - any agent (Claude Desktop, A2A) can call MantleFlow's distribution tools." },
  { num: "03", title: "AI Agent Skill", body: "Packaged as an open SKILL.md skill wrapping the MCP server - drop it into any skills-aware agent." },
];

export function AgentStack() {
  return (
    <div className="border-b-2 border-paper px-6 py-24 md:px-[34px]">
      <div className="mb-[30px] font-mono text-xs tracking-[0.16em] text-mut">§05 - AGENT-NATIVE</div>
      <h2 className="m-0 mb-14 max-w-[1000px] font-display text-[clamp(30px,5.2vw,68px)] font-bold uppercase leading-[0.95] tracking-[-0.02em]">
        Built on Mantle's <span className="text-acid">agent stack.</span>
      </h2>
      <div className="grid border-2 border-paper md:grid-cols-3">
        {STACK.map((c, i) => (
          <div
            key={c.num}
            className={`group flex min-h-[210px] flex-col gap-3.5 border-paper px-[26px] pb-[34px] pt-[30px] transition-colors hover:bg-acid hover:text-ink ${i < 2 ? "border-b-2 md:border-b-0 md:border-r-2" : ""}`}
          >
            <span className="font-mono text-xs text-mut group-hover:text-ink">{c.num}</span>
            <h3 className="m-0 font-display text-[22px] font-bold uppercase tracking-[-0.01em]">{c.title}</h3>
            <p className="m-0 text-[14px] leading-[1.5] text-mut group-hover:text-ink">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Manifesto() {
  return (
    <div className="border-b-2 border-ink bg-acid px-6 py-28 text-ink md:px-[34px]">
      <div className="mb-6 font-mono text-xs tracking-[0.16em]">§04 - POSITION</div>
      <h2 className="m-0 font-display text-[clamp(54px,13vw,200px)] font-extrabold uppercase leading-[0.82] tracking-[-0.04em]">
        Distribution
        <br />
        &gt; Issuance
      </h2>
      <p className="m-0 mt-9 max-w-[620px] text-[18px] font-medium leading-[1.5]">
        Mantle is the distribution layer for real-world assets. mantleflow is the instrument that proves
        it - asset by asset, venue by venue, gate by gate.
      </p>
    </div>
  );
}

export function Footer() {
  return (
    <div className="overflow-hidden px-6 pb-12 pt-20 md:px-[34px]">
      <h2 className="m-0 whitespace-nowrap font-display text-[clamp(40px,12vw,200px)] font-extrabold uppercase leading-[0.82] tracking-[-0.04em]">
        Mantle<span className="text-acid">flow</span>
      </h2>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-[30px] border-t-2 border-paper pt-[26px]">
        <LaunchCTA />
        <div className="text-right font-mono text-[11px] leading-[1.9] text-mut">
          THE RESEARCH AGENT FOR RWA DISTRIBUTION
          <br />
          BUILT FOR THE MANTLE RWA STACK · © 2026
        </div>
      </div>
    </div>
  );
}
