# MantleFlow — Demo Video Script (≈ 2:30–3:00)

> Goal: prove the four judging axes (quality, accuracy, originality, depth) on screen, with the
> brief's one live example as the spine. Everything shown is live + reproducible — no slides faking
> data. Record at 1080p+, screen + voiceover. Live tool: **https://mantleflow.vercel.app**.
> Keep MNT in the agent wallet so settlement gas is covered before recording.

---

## Pre-flight checklist (do before hitting record)
- [ ] `https://mantleflow.vercel.app` loads; `/app` loads.
- [ ] A browser wallet (e.g. MetaMask) installed, on **Mantle Sepolia (5003)**, with a fresh address.
- [ ] Agent wallet `0x8974881E…` funded with MNT (pays settlement + provenance gas).
- [ ] Open these tabs ready to cut to: the live `agent-card.json`, Sepolia explorer
      (`explorer.sepolia.mantle.xyz`), `docs/RESEARCH.md`.

---

## Shot list

### 0:00–0:20 — The thesis (cold open, landing page)
**On screen:** the landing hero at `/`.
**VO:** "Tokenizing an asset is the easy part. The hard part Mantle itself calls out is
*distribution* — once a real-world asset is issued, where can you actually buy it, sell it, borrow
against it, bridge it… and who's gated from holding it at all? MantleFlow answers that, on-chain, for
real Mantle assets — and every number it shows you carries a source receipt."

### 0:20–0:50 — The one live example: "I hold $1M of MI4"
**On screen:** go to `/app`, type *"I hold $1M of MI4 — where can I exit it, how deep is secondary
liquidity, what can I borrow against it, and am I gated?"* Run (free map loads).
**VO:** "This is the brief's example. MI4 is Mantle's tokenized index, transfer-agent Securitize.
Watch what the agent finds." Let the distribution map render.

### 0:50–1:25 — The headline finding (drill into the receipts)
**On screen:** open the **Gates** tab → the Securitize DS-Token allowlist finding; hover a
`<SourceTag>` to show the receipt (source + timestamp). Then **Distribution/Liquidity** tab → "no
on-chain secondary venue".
**VO:** "Two findings, both source-backed. One: the holder is *gated* — transfers are restricted to a
permissioned allowlist, detected from the contract's own bytecode. Two: there is *no on-chain
secondary venue* — we checked every Merchant Moe factory and DefiLlama; nothing. So the honest answer
to 'where can I exit $1M of MI4?' is: you can't, on the open market — only by issuer redemption. That
*absence* is the research result. It proves the thesis on a single asset."

### 1:25–1:45 — It's not a broken detector: the counter-example
**On screen:** switch the asset chip to **mETH**; show borrowability (Lendle, 82.5% LTV) and a live
secondary venue.
**VO:** "To prove that's a real signal and not a broken detector — here's mETH: freely transferable,
live venues, accepted as collateral on Lendle at 82.5% LTV. The engine scores high-distribution
assets high and undistributed ones low. The contrast is the point."

### 1:45–2:05 — Depth of research: cross-chain + the engine
**On screen:** Routes/cross-chain view; mention LayerZero OFT vs CCIP.
**VO:** "Going deeper: cross-chain. Mantle's RWAs bridge by LayerZero OFT — or not at all. We
confirmed on-chain that cmETH and USDe are OFTs, and that *none* of these RWAs are on Mantle's
Chainlink CCIP token set. Six independent signals per asset, each one sourced, the composite labelled
with exactly which sub-scores went into it. We never show a number we can't source."

### 2:05–2:35 — The agent-native stack: x402 + ERC-8004 (live, on-chain)
**On screen:** the Overview "AI deep-dive · 0.01 tmUSD" paywall → click **Get test tmUSD** (faucet) →
**Pay & run** → wallet signs (no gas) → answer renders with the settlement tx link → cut to the tx on
the Sepolia explorer. Then click **Attest result on-chain** → show the provenance tx; cut to
`agent-card.json` showing agentId 309.
**VO:** "And it's a real Mantle agent. The deep analysis is paywalled with genuine x402 — HTTP 402, an
EIP-3009 signature, settled on-chain; the buyer pays no gas and no real money, just signs. It holds an
ERC-8004 identity — agent 309 — and stamps a tamper-evident provenance receipt of each analysis to its
own on-chain identity. Anyone can recompute the result, hash it, and find the matching event."

### 2:35–3:00 — Close (accuracy + reproducibility)
**On screen:** cut to `docs/RESEARCH.md` / `docs/VERIFIED.md`.
**VO:** "Everything you saw is live, reproducible, and sourced — a fact ledger backs every claim with
a primary source and a date, and the code is public. MantleFlow: the distribution layer for Mantle's
real-world assets, measured on-chain. Thanks for watching."

---

## Recording notes
- If the faucet/settlement is slow on camera, pre-warm one paid query just before recording so the RPC
  is hot; the on-camera one then confirms quickly.
- Show at least **two** `<SourceTag>` receipts on camera — that's the accuracy axis, visually.
- Keep the testnet labelling visible during the x402 segment (honesty; tmUSD has no real value).
- Don't claim a mainnet deployment of identity/x402 — they're on Sepolia by design (env-switchable).
</content>
