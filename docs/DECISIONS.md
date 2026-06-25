# DECISIONS.md — MantleFlow Architecture Decision Log

> Consequential, durable decisions and their rationale. Keep current as we go.
> Last updated: **2026-06-25**.

---

### D1 — Backend stack: TypeScript end-to-end (overrides the brief's Go mandate)
**Date:** 2026-06-25. **Status:** locked.
The brief specified Go for `/agent`. Decision reversed by the project owner after Phase 0
verification: every agent-native primitive we MUST demo (MCP server, x402 client signing via
EIP-3009, ERC-8004 reads/writes, Anthropic SDK) has first-class TypeScript support and thinner Go
support, and the web app is already TS/Next.js. The moat (Distribution Score engine) is
language-agnostic and the deadline is non-binding, so we optimize for fewest integration unknowns.
**Stack:** viem (Mantle reads/writes), Anthropic TS SDK (LLM), `@modelcontextprotocol/sdk` (MCP),
x402 TS packages + QuestFlow facilitator, Zod (validation), Vitest (tests). Foundry only if we
deploy a contract.

### D2 — Network: Sepolia-first
**Date:** 2026-06-25. **Status:** locked.
Identity/reputation writes and any deploys happen on Mantle Sepolia (5003) first. Asset reads use
mainnet (5000) where the asset is mainnet-only (e.g. MI4). Mainnet writes only when stable.

### D3 — x402 settlement asset: USDC via QuestFlow facilitator
**Date:** 2026-06-25. **Status:** locked (asset), pending (schema).
Settle in USDC on Mantle (`0x09Bc…0dF9`, EIP-3009) through `facilitator.questflow.ai`. Mantle is not
a Coinbase CDP facilitator network, so QuestFlow is the path. Fallback: our own minimal x402
facilitator on Sepolia if QuestFlow access/schema blocks us.

### D4 — ERC-8004: Identity + Reputation only
**Date:** 2026-06-25. **Status:** locked.
The Validation Registry is not deployed on Mantle. Use the deployed Identity + Reputation registries
(addresses on-chain verified, VERIFIED.md §3). Revisit if validation becomes necessary.

### D5 — Accuracy invariant: SourceReceipt on every datum
**Date:** 2026-06-25. **Status:** locked.
Every externally-sourced datum is wrapped in a `SourceReceipt { sourceName, url, observedAt, kind }`
(`agent/src/types/source-receipt.ts`) and rendered in the UI. The Distribution Score engine refuses
to emit a composite without its sub-scores and their receipts. Accuracy is a judging axis, so it is
a code rule.

### D6 — Address-trust rule: verify on-chain before any write
**Date:** 2026-06-25. **Status:** locked.
No contract address is used for a write until confirmed on-chain (`eth_getCode` + a read) against a
primary explorer/RPC. The ERC-8004 registries, USDC, and MI4 in VERIFIED.md have passed this gate.

### D7 — Monorepo layout
**Date:** 2026-06-25. **Status:** locked.
pnpm workspaces + Turborepo. `/agent` (TS core lib), `/web` (Next.js + API routes, Vercel),
`/mcp` (MCP server over `/agent`), `/contracts` (Foundry, only if deploying), `/skill` (SKILL.md
wrapping MCP), `/docs`. Packages join the workspace as they gain a `package.json`.
