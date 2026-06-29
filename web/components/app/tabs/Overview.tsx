"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DistributionMap } from "@mantleflow/agent";
import { overviewStats } from "../../../lib/derive";
import { attest, type AttestResponse } from "../../../lib/api";
import { payAndRunQuery, type DeepDiveResult, type DeepDiveStep } from "../../../lib/x402";
import { SourceTag } from "../../SourceTag";

/**
 * Overview = the engine's headlines (free) + four real stats, plus an x402-gated "AI deep-dive"
 * (premium LLM analysis paid in testnet tmUSD). Free browsing for everyone; the LLM narrative is paid.
 */
export function OverviewTab({ map, answer }: { map: DistributionMap; answer: string | null }) {
  const [deep, setDeep] = useState<DeepDiveResult | null>(null);
  const shownAnswer = deep?.answer ?? answer;
  const s = overviewStats(map);
  const cells = [
    { k: "VENUES", v: s.venues.value, tone: s.venues.tone, receipt: s.venues.receipt },
    { k: "DEPTH", v: s.depth.value, tone: s.depth.tone, receipt: s.depth.receipt },
    { k: "BEST SLIP / $250K", v: s.bestSlip.value, tone: s.bestSlip.tone, receipt: s.bestSlip.receipt },
    { k: "HOLDING", v: s.holding.value, tone: s.holding.tone, receipt: s.holding.receipt },
  ];

  return (
    <div className="px-[38px] py-10">
      <div className="mb-[18px] flex items-center gap-2.5">
        <span className="h-2 w-2 bg-acid" />
        <span className="font-mono text-xs tracking-[0.1em] text-mut">AGENT ANSWER</span>
      </div>

      {/* Headline always shows in the big display font; the (paid) LLM narrative renders below it as
          readable GFM prose — tables/lists parse via remark-gfm, sized for reading, not display. */}
      <p className="m-0 mb-5 max-w-[920px] font-display text-[clamp(22px,2.6vw,34px)] font-medium leading-[1.28] tracking-[-0.01em]">
        {map.headlines.join(". ")}.
      </p>
      {shownAnswer ? (
        <div className="answer mb-6 max-w-[760px] font-sans text-[15px] leading-[1.7] text-paper">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{shownAnswer}</ReactMarkdown>
        </div>
      ) : null}

      {/* `done` = the PAID deep-dive has completed (not merely that the free answer is shown), so the
          "RUN AI DEEP-DIVE" button stays available after the free LLM answer renders. */}
      <DeepDiveBlock map={map} done={deep != null} settlement={deep?.settlement} onResult={setDeep} />

      <div className="grid grid-cols-2 border-2 border-paper md:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.k}
            className={`px-[22px] py-6 ${i < cells.length - 1 ? "border-r-2 border-paper" : ""} ${i < 2 ? "border-b-2 border-paper md:border-b-0" : ""}`}
          >
            <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-mut">
              {c.k} {c.receipt ? <SourceTag receipt={c.receipt} /> : null}
            </div>
            <div
              className={`mt-2 font-display text-[34px] font-extrabold leading-none ${
                c.tone === "acid" ? "text-acid" : c.tone === "mut" ? "text-mut" : "text-paper"
              }`}
            >
              {c.v}
            </div>
          </div>
        ))}
      </div>

      {map.composite != null ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-line pt-5">
          <span className="font-mono text-xs text-mut">COMPOSITE</span>
          <span className="font-display text-[22px] font-extrabold text-acid">{map.composite}</span>
          <span className="font-mono text-[11px] text-mut2">/100 · {map.compositeNote}</span>
        </div>
      ) : null}

      <div className="mt-4 border-t-2 border-line pt-5 font-mono text-xs text-mut">
        DRILL DOWN → distribution map · liquidity depth · exit routes · compliance gates
      </div>

      <AttestBlock map={map} />
    </div>
  );
}

const STEP_LABEL: Record<DeepDiveStep, string> = {
  idle: "",
  requesting: "REQUESTING…",
  connecting: "CONNECT WALLET…",
  funding: "MINTING TEST tmUSD…",
  signing: "SIGN PAYMENT…",
  settling: "SETTLING + ANALYSING…",
};

/**
 * x402 premium: the LLM "deep-dive" analysis, paid in testnet tmUSD via a real EIP-3009 settlement.
 * Free browsing stays free; this is the only gated action. Gasless + no real funds.
 */
function DeepDiveBlock({
  map,
  done,
  settlement,
  onResult,
}: {
  map: DistributionMap;
  done: boolean;
  settlement?: DeepDiveResult["settlement"];
  onResult: (r: DeepDiveResult) => void;
}) {
  const [step, setStep] = useState<DeepDiveStep>("idle");
  const [err, setErr] = useState<string | null>(null);

  // The PREMIUM deep-dive (x402) goes beyond the free answer: a full $1M-exit playbook + cross-asset
  // comparison to the other tracked Mantle RWAs, with a ranked venue/route/borrow plan.
  const query =
    `Deep-dive on ${map.asset.symbol}: I hold $1M — give me a ranked exit playbook (best venues by ` +
    `liquidity/slippage, borrow options, cross-chain routes, and compliance gating), and compare ${map.asset.symbol}'s ` +
    `distribution against the other tracked Mantle RWAs (MI4, mETH, cmETH, fBTC, USDe, USDY).`;

  async function run() {
    setErr(null);
    try {
      const r = await payAndRunQuery(query, setStep);
      if (r.error) setErr(r.error);
      else onResult(r);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(/user rejected|denied/i.test(m) ? "Signature rejected." : m.split("\n")[0]);
    } finally {
      setStep("idle");
    }
  }

  if (done) {
    return settlement?.txHash ? (
      <div className="mt-1 mb-8 inline-flex flex-wrap items-center gap-2 border-2 border-line px-3 py-2 font-mono text-[10px]">
        <span className="bg-acid px-1.5 py-0.5 font-semibold uppercase tracking-[0.06em] text-ink">x402 paid</span>
        <span className="text-mut2">settled {settlement.amount} tmUSD (testnet, {settlement.via})</span>
        <a href={settlement.explorerUrl} target="_blank" rel="noreferrer" className="truncate text-acid underline">
          {settlement.txHash.slice(0, 16)}…
        </a>
      </div>
    ) : null;
  }

  const busy = step !== "idle";
  return (
    <div className="mt-1 mb-8 border-2 border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] tracking-[0.08em] text-mut">AI DEEP-DIVE · x402 PREMIUM</div>
          <p className="m-0 mt-1 max-w-[560px] font-mono text-[10px] leading-[1.6] text-mut2">
            The agent's answer above is <span className="text-mut">free</span>. This premium deep-dive adds a ranked $1M-exit
            playbook + cross-asset comparison — 0.01 tmUSD on Mantle Sepolia (a <span className="text-mut">testnet</span> token, minted
            free, gasless: you only sign). Real x402 settlement.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="shrink-0 border-2 border-acid bg-acid px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.04em] text-ink transition-colors hover:bg-ink hover:text-acid disabled:opacity-50"
        >
          {busy ? STEP_LABEL[step] : "RUN AI DEEP-DIVE · 0.01 tmUSD →"}
        </button>
      </div>
      {err ? <p className="mt-3 font-mono text-[10px] text-mut">⚠ {err}</p> : null}
    </div>
  );
}

/**
 * On-chain provenance: write an ERC-8004 Reputation entry whose feedbackHash commits to THIS exact
 * result. Framed as a tamper-evident provenance receipt of work done — NOT a self-awarded score.
 */
function AttestBlock({ map }: { map: DistributionMap }) {
  const [state, setState] = useState<"idle" | "writing">("idle");
  const [res, setRes] = useState<AttestResponse | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  async function onAttest() {
    setState("writing");
    setRes(null);
    setUnavailable(null);
    try {
      const r = await attest(map);
      if (r.ok) setRes(r.data);
      else setUnavailable(r.data.error ?? "Attestation unavailable on this deployment.");
    } catch (e) {
      setUnavailable(e instanceof Error ? e.message : String(e));
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="mt-6 border-2 border-line p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.08em] text-mut">ON-CHAIN PROVENANCE · ERC-8004</span>
        <button
          onClick={onAttest}
          disabled={state === "writing"}
          className="border-2 border-acid bg-transparent px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-acid transition-colors hover:bg-acid hover:text-ink disabled:opacity-50"
        >
          {state === "writing" ? "WRITING…" : "ATTEST RESULT ON-CHAIN →"}
        </button>
      </div>
      <p className="m-0 font-mono text-[10px] leading-[1.6] text-mut2">
        Writes a tamper-evident receipt to the agent's on-chain ERC-8004 identity (Mantle) whose hash
        commits to this exact result — a provenance record of work done, <span className="text-mut">not</span> a self-awarded score.
      </p>

      {res?.txHash ? (
        <div className="mt-3 border-t-2 border-line pt-3 font-mono text-[11px]">
          {res.verified ? (
            <div className="mb-2 inline-block bg-acid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink">
              ✓ Independently verified on-chain{res.blockNumber ? ` · block ${res.blockNumber}` : ""}
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <span className="text-mut2">tx</span>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="truncate text-acid underline">
              {res.txHash}
            </a>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-mut2">result hash</span>
            <span className="truncate text-paper">{res.resultHash}</span>
          </div>
          <p className="mt-2 text-[10px] leading-[1.6] text-mut2">
            Verified by decoding the tx receipt’s MetadataSet event (agentId + keccak256 of this exact
            result) — re-checkable at{" "}
            <code className="text-mut">
              /api/verify?tx={res.txHash?.slice(0, 10)}…&amp;hash={res.resultHash?.slice(0, 10)}…
            </code>
          </p>
        </div>
      ) : null}

      {unavailable ? <p className="mt-3 font-mono text-[11px] text-mut">⚠ {unavailable}</p> : null}
    </div>
  );
}
