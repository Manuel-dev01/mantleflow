"use client";

import { useEffect, useState } from "react";
import { getAgent, type AgentInfo } from "../../lib/api";
import { SourceTag } from "../SourceTag";

/**
 * The agent's ERC-8004 on-chain identity — a compact badge that expands to the verifiable details
 * (agentId, owner, registries, AgentCard, provenance-receipt count) read live from Mantle Sepolia.
 * Degrades honestly to "identity pending" when not yet registered.
 */
export function AgentIdentity() {
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getAgent()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const registered = info?.registered && info.identity;
  const agentId = info?.identity?.value.agentId;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 border-2 border-line px-2.5 py-1.5 font-mono text-[10px] tracking-[0.04em] text-mut transition-colors hover:border-acid hover:text-acid"
        title="ERC-8004 on-chain identity"
      >
        <span className={`h-1.5 w-1.5 ${registered ? "bg-acid" : "bg-mut2"}`} />
        {registered ? `ERC-8004 #${agentId}` : "ERC-8004 PENDING"}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-[320px] border-2 border-paper bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper">
          <div className="mb-2 flex items-center justify-between">
            <span className="tracking-[0.08em] text-mut">AGENT IDENTITY · ERC-8004</span>
            {info?.identity ? <SourceTag receipt={info.identity.receipt} /> : null}
          </div>

          {registered && info?.identity ? (
            <dl className="space-y-1">
              <Row k="agentId" v={`#${agentId}`} />
              <Row
                k="owner"
                v={short(info.identity.value.owner)}
                href={`${info.registry.explorer}/address/${info.identity.value.owner}`}
              />
              <Row
                k="identity reg"
                v={short(info.registry.identity)}
                href={`${info.registry.explorer}/address/${info.registry.identity}`}
              />
              <Row
                k="reputation reg"
                v={short(info.registry.reputation)}
                href={`${info.registry.explorer}/address/${info.registry.reputation}`}
              />
              <Row k="network" v={info.registry.network} />
              {info.provenance ? (
                <Row k="provenance receipts" v={String(info.provenance.value.count)} />
              ) : null}
              <div className="pt-1">
                <a href={info.registry.agentCardUrl} target="_blank" rel="noreferrer" className="text-acid underline">
                  AgentCard ↗
                </a>
              </div>
            </dl>
          ) : (
            <p className="m-0 text-mut">
              Identity not yet registered on Mantle Sepolia. The registries are live
              ({short(info?.registry.identity ?? "")}); registration writes the agentId.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, v, href }: { k: string; v: string; href?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-mut2">{k}</dt>
      <dd className="m-0 truncate text-paper">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-acid underline">
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
