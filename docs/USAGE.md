# Using MantleFlow

**How to ask MantleFlow a question — from the web app, the HTTP API, or any AI agent.**

Live tool: **https://mantleflow.vercel.app**

---

## In the browser

Open the app and ask in plain language, e.g.:

> *"I hold $1M of MI4 — where can I exit it, how deep is secondary liquidity, what can I borrow against
> it, and what's the cheapest route to move it to another chain?"*

The agent reads live Mantle state and returns a written answer grounded in real data — venues by DEX,
liquidity and 24h volume, borrowability, compliance gates — alongside a **distribution map** you can
explore by tab:

- **Overview** — the headline, the composite Distribution Score, and key stats, each with a source receipt.
- **Distribution** — every venue the asset reaches (trading nodes, yield/vault positions, bridge routes).
- **Liquidity** — trading venues with DEX name, liquidity, 24h volume, and labelled ±2% / slippage estimates.
- **Routes** — verified cross-chain channels (LayerZero OFT / CCIP), or the honest "no permissionless
  bridge" finding.
- **Gates** — the compliance tier (gated / blockable / open), the on-chain mechanism, and its evidence.

A token-facts strip (price, market cap, FDV, 24h volume, supply) shows on every tab. Switching between
the tracked assets — **MI4, mETH, cmETH, fBTC, USDe, USDY** — is instant.

**Pricing tiers.** Asking a question and browsing every tab is **free**. A premium cross-asset
*deep-dive* is metered with x402 (see below) and is the only paid surface.

---

## HTTP API

| Endpoint | Method | Purpose | Cost |
|----------|--------|---------|------|
| `/api/query` | `POST` `{ query }` | Free natural-language answer + distribution map | Free |
| `/api/query` | `POST` `{ query, deep: true }` | Premium cross-asset deep-dive | x402-metered |
| `/api/map?symbol=` | `GET` | Distribution map for one asset (no LLM) | Free |
| `/.well-known/agent-card.json` | `GET` | The agent's identity card (registries, agentId, x402 block) | Free |
| `/api/verify?tx=&hash=` | `GET` | Re-confirm an on-chain provenance attestation | Free |

```bash
# Free answer
curl -s -X POST https://mantleflow.vercel.app/api/query \
  -H "content-type: application/json" -d '{"query":"what is mETH and where can I trade it?"}'

# Free map for one asset
curl -s "https://mantleflow.vercel.app/api/map?symbol=MI4"
```

With x402 disabled by configuration the deep-dive runs free too, so a self-hosted deployment stays
fully functional out of the box.

---

## As an AI Agent Skill (MCP)

MantleFlow ships as a **Mantle AI Agent Skill** in the open `SKILL.md` format
([`skill/mantleflow-distribution/`](../skill/mantleflow-distribution)), wrapping an **MCP server**
([`mcp/`](../mcp), stdio transport). Any MCP-capable agent (e.g. Claude Desktop or CLI) can install the
skill and call the engine's tools directly:

- `get_distribution_map` — the full Distribution Score map for an asset
- `compare_assets` — side-by-side across the tracked assets
- `resolve_asset` — natural-language symbol/name → asset
- `list_tracked_assets` — the supported asset set
- `get_agent_identity` — the agent's on-chain identity

The web API and the MCP tools share one capability layer, so a result is identical whichever way you
reach it.

---

## Verifiable identity & provenance (ERC-8004)

MantleFlow is a first-class on-chain agent, not an anonymous endpoint.

- **Identity.** The agent is registered under **ERC-8004**. Its identity card lives at
  [`/.well-known/agent-card.json`](https://mantleflow.vercel.app/.well-known/agent-card.json) — the exact
  `agentURI` recorded on-chain — and advertises the identity/reputation registries, the agentId, and the
  x402 block. It is registered on **Mantle mainnet as agentId 141**, with a prior Sepolia identity
  (#309); the live site reads whichever network it is configured for.
- **Provenance.** On each completed analysis the agent stamps `keccak256(canonicalJSON(map))` into its
  own identity via `Identity.setMetadata` — a tamper-evident, content-addressed receipt of the work.
  Anyone can recompute the map, hash it, and find the matching on-chain event; `/api/verify?tx=&hash=`
  does exactly that.
- **Reputation — genuinely third-party.** The deployed reputation registry forbids self-feedback
  on-chain, so the agent cannot inflate its own score. Visitors rate it from their **own** browser
  wallet, which means any displayed rating is real, independent reputation.

---

## x402 pay-per-query

The premium deep-dive is gated with a genuine **HTTP 402 + EIP-3009** flow:

1. `POST /api/query { query, deep: true }` with no payment → **HTTP 402** and a well-formed challenge
   (`{ x402Version, accepts: [{ scheme: "exact", network, asset, maxAmountRequired, payTo, … }] }`).
2. The buyer signs an **EIP-3009 `transferWithAuthorization`** — gasless, no transaction sent by them.
3. The server self-settles by submitting that signed authorization on-chain; settlement is
   explorer-verifiable and replay is rejected on-chain.

In the demo configuration this runs on **Mantle Sepolia** with a test stablecoin (**tmUSD**, clearly
labelled, no real value) and a server-funded faucet, so a buyer needs **zero gas and zero real money** —
they only sign. The QuestFlow facilitator and mainnet USDC are pluggable via environment variables.

---

## Self-hosting

```bash
pnpm install
pnpm test          # vitest across packages
pnpm typecheck
pnpm -C web build  # build the web app + API
```

Configuration is via environment variables (LLM key, RPC endpoints, the agent key, and the optional
x402 / network switches). With x402 left disabled, every endpoint is free and the app is fully
functional.
