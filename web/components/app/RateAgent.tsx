"use client";

import { useState } from "react";
import { REPUTATION_ABI } from "@mantleflow/agent";
import { connect as connectWallet, giveFeedback, hasWallet, type WalletNetwork } from "../../lib/wallet";

/**
 * Genuine third-party reputation: the VISITOR connects their own wallet (on the agent's identity
 * network — mainnet by default) and signs giveFeedback(agentId,…) themselves. The contract forbids
 * self-feedback, so this is the only honest way reputation accrues — visitor's address + gas, not ours.
 * Registry/explorer/network are passed in from the live AgentCard (single source of truth).
 */
export function RateAgent({
  agentId,
  reputationRegistry,
  explorer,
  network,
  onRated,
}: {
  agentId: string;
  reputationRegistry: string;
  explorer: string;
  network: WalletNetwork;
  onRated?: () => void;
}) {
  const [account, setAccount] = useState<string | null>(null);
  const [score, setScore] = useState(5);
  const [busy, setBusy] = useState<"connect" | "rate" | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function connect() {
    setErr(null);
    setBusy("connect");
    try {
      setAccount(await connectWallet(network));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function rate() {
    if (!account) return;
    setErr(null);
    setBusy("rate");
    setTx(null);
    try {
      const hash = await giveFeedback({
        account: account as `0x${string}`,
        reputationRegistry: reputationRegistry as `0x${string}`,
        abi: REPUTATION_ABI,
        agentId,
        score,
        endpoint: "https://mantleflow.vercel.app/app",
      });
      setTx(hash);
      onRated?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(/self-feedback/i.test(msg) ? "That wallet owns the agent — feedback must come from a different address." : msg.split("\n")[0]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 border-t-2 border-line pt-3">
      <div className="mb-2 font-mono text-[10px] tracking-[0.08em] text-mut">RATE THIS AGENT (THIRD-PARTY)</div>

      {!hasWallet() ? (
        <p className="m-0 font-mono text-[10px] leading-[1.6] text-mut2">
          No injected wallet detected. Install MetaMask (on {network === "mainnet" ? "Mantle, a little MNT for gas" : "Mantle Sepolia"}) to
          post on-chain feedback from your own address.
        </p>
      ) : !account ? (
        <button
          onClick={connect}
          disabled={busy === "connect"}
          className="border-2 border-acid bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[0.04em] text-acid transition-colors hover:bg-acid hover:text-ink disabled:opacity-50"
        >
          {busy === "connect" ? "CONNECTING…" : "CONNECT WALLET"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-line">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`px-2 py-1 font-mono text-[11px] ${n <= score ? "bg-acid text-ink" : "text-mut hover:text-paper"}`}
              >
                ★
              </button>
            ))}
          </div>
          <button
            onClick={rate}
            disabled={busy === "rate"}
            className="border-2 border-acid bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[0.04em] text-acid transition-colors hover:bg-acid hover:text-ink disabled:opacity-50"
          >
            {busy === "rate" ? "SIGNING…" : `SUBMIT ${score}★ →`}
          </button>
          <span className="font-mono text-[9px] text-mut2">{account.slice(0, 6)}…{account.slice(-4)}</span>
        </div>
      )}

      {tx ? (
        <p className="mt-2 font-mono text-[10px]">
          <span className="text-mut2">rating tx </span>
          <a href={`${explorer}/tx/${tx}`} target="_blank" rel="noreferrer" className="truncate text-acid underline">
            {tx.slice(0, 18)}…
          </a>
        </p>
      ) : null}
      {err ? <p className="mt-2 font-mono text-[10px] text-mut">⚠ {err}</p> : null}
    </div>
  );
}
