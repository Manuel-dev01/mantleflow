# VERIFIED.md — MantleFlow Fact Ledger

> The source of truth for confirmed facts. Format: **claim — value — primary source — date confirmed**.
> A fact is "verified" only from a primary source (Mantle docs/GitHub/official post, the spec, the
> issuer, or a direct on-chain read). Secondary/news sources are allowed for *context figures* but
> must be dated and labeled. Never silently overwrite a verified fact — surface conflicts first.
> Last updated: **2026-06-25**.

---

## 0. Phase 0 verification gate — status

All four high-risk unknowns resolved on **2026-06-25**. Architecture locked (see DECISIONS.md).
Remaining open items are tracked in §6 (non-blocking).

---

## 1. The Challenge

- **Program exists** — "Mantle Research Challenge: Prove the Next Move in Onchain Finance" —
  @Mantle_Official, posted **2026-06-16** (https://x.com/Mantle_Official/status/2066880937271722093).
  Thesis (verbatim from the post's article card): *"Issuing tokenized assets is only one part of the
  problem. The harder challenge may be distribution: moving capital market assets from issuance to
  global markets without friction, borders, or…"* — confirmed via X syndication card, 2026-06-25.
- **Deadline** — treated as **non-binding** per project owner direction (2026-06-25). Optimize for
  depth/quality. (Public Turing Test Hackathon 2026 Demo Day is July 2–3; that is a *separate*
  program — devhub.mantle.xyz.) The Research Challenge's own rubric/submission page is not yet
  web-indexed → see §6.1.

## 2. Networks (confirmed; gas token MNT)

- **Mantle mainnet** — chainId **5000** (`eth_chainId` → `0x1388`); RPC `https://rpc.mantle.xyz`;
  explorer `explorer.mantle.xyz`. — direct RPC, 2026-06-25.
- **Mantle Sepolia** — chainId **5003** (`eth_chainId` → `0x138b`, confirmed live); RPC
  `https://rpc.sepolia.mantle.xyz`; explorer `explorer.sepolia.mantle.xyz`. — direct RPC, 2026-06-25.

## 3. ERC-8004 (agent identity / reputation / validation)

- **Spec + reference impl** — https://eips.ethereum.org/EIPS/eip-8004 ;
  https://github.com/erc-8004/erc-8004-contracts — 2026-06-25.
- **Registry function signatures** (from reference contracts):
  - Identity: `register() | register(string uri) | register(string uri, MetadataEntry[] meta) → uint256 agentId`;
    `setAgentURI(uint256 agentId, string newURI)`; `setMetadata(uint256 agentId, string key, bytes value)`;
    `setAgentWallet(uint256 agentId, address wallet, uint256 deadline, bytes sig)`.
  - Reputation: `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)`;
    `readFeedback(...)`, `revokeFeedback(...)`, `getSummary(...)`.
  - Validation: `validationRequest(address validator, uint256 agentId, string requestURI, bytes32 requestHash)`;
    `validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)`.
- **Deployed addresses on Mantle — ON-CHAIN VERIFIED 2026-06-25** (eth_getCode + read):

  | Registry   | Network         | Address                                      | Evidence |
  |------------|-----------------|----------------------------------------------|----------|
  | Identity   | mainnet (5000)  | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | code present; `name()`→"AgentIdentity", `symbol()`→"AGENT" |
  | Reputation | mainnet (5000)  | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | code present (ERC-1967 proxy) |
  | Identity   | sepolia (5003)  | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | code present (proxy); `name()`→"AgentIdentity" |
  | Reputation | sepolia (5003)  | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | code present (proxy) |
  | Validation | mainnet+sepolia | **NOT DEPLOYED on Mantle**                   | not found on explorers / ref repo |

  → Use **Identity + Reputation** only. Skip on-chain validation (or deploy our own ref instance to
  Sepolia later if needed).
- **AgentCard** — JSON at an `agentURI` (`ipfs://`, `https://`, or `data:` URI) with `type`, `name`,
  `description`, `image`, `services[]` (A2A / MCP / web endpoints). — EIP-8004, 2026-06-25.

## 4. AI Agent Skills (the bonus)

- **Format = open Anthropic `SKILL.md` folder** — folder named for the skill + `SKILL.md` (YAML
  frontmatter: `name` ≤64 chars kebab-case matching dir; `description` ≤1024 chars stating what +
  when; optional `license`/`metadata`/`allowed-tools`) + optional `scripts/`, `references/`,
  `assets/`. — https://agentskills.io/specification, 2026-06-25.
- **No distinct Mantle skill-registry submission documented.** → Ship a `SKILL.md` package that wraps
  our MCP server; register per Mantle Agent Scaffold docs if/when located (§6.4). — 2026-06-25.
- Mantle shipped the agent stack (ERC-8004 + AI Agent Skills + Agent Scaffold + x402/QuestFlow) in
  Q1 2026. — PRNewswire 2026-02-16 "Mantle Unlocks Autonomous Economy with ERC-8004 Deployment"
  (context/secondary), corroborated by on-chain registry deploys above (primary).

## 5. x402 / QuestFlow payments

- **x402 standard** — github.com/coinbase/x402 — 2026-06-25. 402 body:
  `{ x402Version, accepts: [{ scheme:"exact", network:"eip155:5000", asset, maxAmountRequired, payTo,
  resource, maxTimeoutSeconds, ... }] }`. Client returns base64 `X-PAYMENT` carrying a signed
  **EIP-3009 `transferWithAuthorization`** (`from,to,value,validAfter,validBefore,nonce,sig`).
- **Facilitator** — QuestFlow `https://facilitator.questflow.ai` (verify → settle). Mantle x402
  gateway announced live (@Mantle_Official, @questflow). Exact `/verify`·`/settle` JSON schemas
  **PARTIAL** → confirm against live facilitator in Phase 4. — 2026-06-25.
- **Settlement asset** — **USDC on Mantle mainnet** `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
  (ON-CHAIN VERIFIED 2026-06-25: code present, 3516-hex bytecode; EIP-3009 per Circle v2). CAIP-2
  network id `eip155:5000`. Mantle is **not** in Coinbase CDP's facilitator list → use QuestFlow.

## 6. Tracked assets — on-chain verified

- **MI4 (Mantle Index Four)** — `0x671642ac281c760e34251d51bc9eef27026f3b7a` (mainnet). ON-CHAIN
  VERIFIED 2026-06-25: `name()`→"Mantle Index Four", `symbol()`→"MI4", `decimals()`→6, `totalSupply()`
  non-zero (~1.35M, live read). Token is a **proxy** (170-byte) — Securitize DS-Token pattern; the
  compliance/transfer-restriction logic lives in the implementation contract (the gating signal we
  detect in Phase 1). Issuer/transfer agent: **Securitize**; fund manager Mantle Guard Ltd.
  (explorer.mantle.xyz token page + Securitize/Businesswire launch PR, 2025-04-24).
  - **CONFIRMED LIVE 2026-06-25:** the compliance detector flagged MI4 as a **Securitize DS-Token
    transfer-agent allowlist** (gating functions present on the proxy-resolved implementation ABI via
    Etherscan V2). Reachability: **no on-chain secondary venue** (Merchant Moe factory `getPair` for
    USDC/WMNT/USDT/WETH all empty + DefiLlama no Mantle pool). Both are the headline thesis results.
- Context figure: Mantle **RWA TVL $247.5M, +27.4% QoQ in Q1 2026** — Messari, reported 2026-06-09
  (secondary, dated/labeled).

## 7. Phase 1 data sources & DEX factories

- **Mantlescan API = unified Etherscan API V2** — `https://api.etherscan.io/v2/api?chainid=5000&…`
  (5003 for Sepolia). The old `api.mantlescan.xyz` V1 is **deprecated** (confirmed 2026-06-25 — V1
  returns a deprecation NOTOK). Adapter uses V2 with `ETHERSCAN_API_KEY`.
- **DefiLlama** `https://yields.llama.fi/pools` reachable keyless (confirmed 2026-06-25) — used to
  cross-check secondary-market reachability (token absent from all Mantle pools ⇒ no liquid venue).
- **Merchant Moe DEX factories (candidate — from official docs; code confirmed at runtime):**
  classic MoeFactory `0x5bEF015CA9424A7C07B68490616a4C1F094BEDEc`, Liquidity Book 2.2 Factory
  `0xa6630671775c4EA2743840F9A5016dCf2A104054` — https://docs.merchantmoe.com/resources/contracts.
  (Agni factory: docs domain unreachable 2026-06-25 → deferred to Phase 2.)
- **Public RPC throttling:** `https://rpc.mantle.xyz` rate-limits under burst use; set
  `MANTLE_MAINNET_RPC` to a dedicated endpoint for reliable live reads/demo.

## 8. Phase 2 — assets, lending, methodology (on-chain verified 2026-06-26)

- **Tracked assets** (all `getCode` + DefiLlama-price verified): mETH `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` (18); cmETH `0xE6829d9a7eE3040e1276Fa75293Bde931859e8fA` (18, proxy); fBTC `0xC96dE26018A54D51c097160568752c4E3BD6C364` (8, DefiLlama symbol FBTC, ~$59.7k); USDe `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34` (18, OFT); USDY `0x5bE26527e817998A7206475496fDE1E68957c5A6` (18, proxy + **blocklist transfer hook**). USDe/USDY share their L1 address via deterministic cross-chain deploys — confirmed live on Mantle, not an L1 mix-up.
- **syrupUSDT (Maple): NOT on Mantle.** Maple withdrew USDT from Aave-on-Mantle ~2026-04-20 (rsETH-exploit caution). Recorded as a **distribution finding** ("an RWA that left Mantle — distribution can regress"), not tracked.
- **Lendle** (Aave-v2 fork, borrowability source, getCode-verified): ProtocolDataProvider `0x552b9e4bae485C4B7F540777d7D25614CdB84773`, LendingPool `0xCFa5aE7c2CE8Fadc6426C1ff872cA45378Fb7cF3`, AddressesProvider `0xAb94Bedd21ae3411eB2698945dfCab1D5C19C3d4`. `getReserveConfigurationData`/`getReserveData` return decoded LTV/rates/utilization. (Live read 2026-06-26: mETH = collateral, LTV 82.5%, liq.thr 86%, util ~21%.)
- **DefiLlama coins** `https://coins.llama.fi/prices/current/mantle:0x<addr>` (keyless) — USD pricing for depth/borrow.
- **Depth methodology:** Uniswap-v2 pairs (Merchant Moe classic) → exact ±2%-of-mid USD via constant-product `getReserves`; DefiLlama pool TVL as a labelled liquidity proxy for v3 / Liquidity-Book venues (no precise ±2% claimed). Fragmentation = HHI over per-venue USD liquidity.
- **Composite:** weighted partial (reachability .25, depth .2, fragmentation .15, borrowability .2, compliance .2), renormalised over computed sub-scores, **excludes cross-chain (Phase 4)** — labelled as such.

---

## §6. Open items to close (non-blocking for architecture lock)

1. **Research Challenge rubric/submission page** — not web-indexed. Resolve the t.co from the
   2026-06-16 post / check group.mantle.xyz; confirm tracks (incl. "Track 2 — The Research Agent"),
   judging axes, submission mechanics, and the AI Agent Skills bonus wording before Phase 6 submit.
2. **QuestFlow `/verify`·`/settle` exact schemas** — confirm against the live facilitator (Phase 4).
3. **Agent Scaffold repo / Mantle skill registration path** — locate before Phase 3; fallback is
   plain SKILL.md + MCP.
4. **MI4 implementation contract** — resolve the proxy's implementation slot and inspect its ABI/
   bytecode for the exact transfer-restriction / allowlist hooks (Phase 1 compliance module).
