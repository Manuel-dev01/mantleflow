# MantleFlow — Demo / Feature Checklist

> Run this top-to-bottom to confirm every feature works and to spot regressions before recording or
> submitting. ✅ = expected pass. Live: **https://mantleflow.vercel.app**. Last updated 2026-06-27.
> Items marked **(mainnet)** apply only after the ERC-8004 identity is flipped to mainnet (see §7 of
> the runbook in `docs/VERIFIED.md` / DECISIONS D23); until then identity reads Sepolia #309.

## 1. Landing (`/`)
- [ ] Wordmark "MANTLEFLOW" fits fully at 1440px, 1280px, and 375px widths — **no clipped "W"**.
- [ ] "SEE IT WORK · LIVE" preview shows **MI4**: headline includes "Holder gated by Securitize…"
      and "No on-chain secondary trading venue found"; HOLDING stat = **GATED** (not UNVERIFIED).
- [ ] The preview composite + HOLDING **match what `/app` shows for MI4** (no landing-vs-app drift).
- [ ] Every stat chip has a hoverable source receipt (⌖/SRC). StatBand reads 6 / 6 / 100%.
- [ ] All CTAs route to `/app`.

## 2. Ask flow (`/app`)
- [ ] Typing *"I hold $1M of MI4 — where can I exit it, and am I gated?"* → resolves MI4, renders the
      free distribution map (no payment).
- [ ] Asset chips MI4 / mETH / cmETH / fBTC / USDe / USDY each load via `/api/map` (fast, free).

## 3. Overview tab
- [ ] Headline (display font) + composite + 4 stats render; VENUES counts **trading venues only**.
- [ ] mETH: VENUES = 0, DEPTH = —, HOLDING = OPEN (compliance resolved). MI4: HOLDING = GATED.
- [ ] After a paid deep-dive (see §7), the LLM answer renders **markdown tables as real tables** and
      lists/headings cleanly, at a readable size (not giant display font).
- [ ] Source receipts resolve on each stat.

## 4. Distribution map tab
- [ ] **No "PHASE 4" node anywhere.**
- [ ] Cross-chain shows the real state: for cmETH/USDe a **BRIDGE** node (LayerZero); for mETH/MI4 a
      "NO ROUTE" gated node.
- [ ] Yield/vault nodes (e.g. woofi-earn, circuit-protocol on mETH) are visually distinct (dotted,
      "YIELD") from trading nodes.
- [ ] Legend reads TRADING / BRIDGE / YIELD / GATED.

## 5. Liquidity tab
- [ ] Split into **TRADING VENUES** and **YIELD / VAULT POSITIONS (informational)**.
- [ ] For mETH: trading total = "—" / 0 venues; woofi-earn + circuit-protocol appear under YIELD with
      TVL only (explicitly "not exit liquidity").
- [ ] SLIP/250K shows a number on CPMM pairs, "—" (with caption) on TVL-proxy venues.

## 6. Routes tab
- [ ] cmETH / USDe → "ROUTE VERIFIED" + a green LayerZero-OFT card.
- [ ] mETH / MI4 → a "FINDING · NO PERMISSIONLESS BRIDGE" banner (reads as a finding, not a gap),
      with both LayerZero-OFT and CCIP shown "not available", cost "not quoted".

## 7. Gates tab
- [ ] MI4 → STATUS GATED + mechanism "Securitize DS-Token transfer-agent allowlist" + on-chain evidence.
- [ ] USDY → GATED (Ondo blocklist hook). mETH → FREELY TRANSFERABLE.
- [ ] mETH: the "Lendle reserve is FROZEN" warning is present **and** borrowability scores low (≈20),
      not 91 — the two no longer contradict.
- [ ] Jurisdiction-omission note present.

## 8. x402 pay-per-query (Sepolia)
- [ ] `POST /api/query` with no payment → **HTTP 402** + a well-formed challenge.
- [ ] In Overview, "RUN AI DEEP-DIVE · 0.01 tmUSD" → faucet mint → sign (no gas) → settle → answer +
      a real Sepolia settlement tx link. Buyer needs **0 MNT, 0 real money**.
- [ ] Re-submitting the same nonce is rejected on-chain (replay protection).
- [ ] `/api/map` and all browsing remain free.

## 9. ERC-8004 identity + provenance + reputation
- [ ] Identity badge shows agentId + network; AgentCard (`/.well-known/agent-card.json`) advertises the
      identity registries + agentId and the x402 block.
- [ ] "Attest result on-chain" writes a provenance tx; the ✓ "independently verified" badge appears;
      `/api/verify?tx=&hash=` re-confirms it.
- [ ] "Rate this agent" connects the visitor's own wallet (on the identity network), signs
      `giveFeedback`, records a real third-party rating; explorer links resolve.
- [ ] **(mainnet)** After the flip: AgentCard chain = `eip155:5000`, network "Mantle", new agentId;
      explorer links go to explorer.mantle.xyz; rating spends real MNT (no faucet copy).

## 10. Honesty / accuracy invariants
- [ ] No displayed number lacks a source receipt.
- [ ] tmUSD is clearly labelled testnet with no real value.
- [ ] With `X402_ENABLED` unset, `/api/query` runs free (main stays deployable).
- [ ] No "—"/absence is presented as a bug — each is framed as a finding with its scope ("via probed
      venues", "TVL-proxy", "not quoted").

## Quick CLI smoke
```bash
# 402 gate live + free map free + agent card
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://mantleflow.vercel.app/api/query -H "content-type: application/json" -d '{"query":"x"}'   # 402
curl -s -o /dev/null -w "%{http_code}\n" "https://mantleflow.vercel.app/api/map?symbol=MI4"                                                       # 200
curl -s https://mantleflow.vercel.app/.well-known/agent-card.json | head -c 400
# local engine sanity (accurate sub-scores)
pnpm -C agent test && pnpm -C agent typecheck && pnpm -C web build
```
</content>
