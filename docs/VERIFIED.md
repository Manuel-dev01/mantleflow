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
- **Phase 3 write-ABI re-confirmation (2026-06-27)** — re-fetched the exact signatures from the
  EIP-8004 spec (primary source). Identity is **ERC-721** (agent = NFT `agentId`): we use
  `register(string agentURI) → uint256 agentId`, `setAgentURI`, plus ERC-721 `tokenURI`/`ownerOf`.
  Reputation: `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)` and `getSummary(uint256, address[], string, string) → (uint64 count, int128, uint8)`. Sepolia reachable, **`eth_chainId`→5003 confirmed live 2026-06-27**; both Sepolia registries return code (≈130-byte proxies). The Mantle-Sepolia explorer ABI API was unavailable, so per **D6** every write is **simulated on-chain (`simulateContract`) before broadcast** — a successful simulate against the deployed bytecode confirms the selector/args. ABI captured in `agent/src/erc8004/abis.ts`.
- **Registered agentId = `309`** — registered live on Mantle Sepolia 2026-06-27. Agent wallet
  `0x8974881E39a5eF62214929B6CaA6EC0C6e7D47c7`. Register tx
  `0x107ba4b249c7ec9794f4418c0032b4909d3edad59a0b275e06c9a31d319d5b88`. `register(string agentURI)`
  confirmed working (ERC-721 mint). `ownerOf(309)` + `tokenURI(309)` read back the wallet + AgentCard URL.
- **Provenance write CONFIRMED** — `Reputation.giveFeedback` about own agentId **reverts
  "Self-feedback not allowed"** (the contract forbids self-rating — good). Provenance therefore uses
  **`Identity.setMetadata(agentId, key=resultHash, value=detail)`**; confirmed live, sample tx
  `0x021ce501da2e2e35391fc83e99ae5f03b08e352ad5c6c09fece7294dc20ee2a4` emits a `MetadataSet` event
  (`topic1`=agentId 309, `topic2`=keccak256(resultHash)). See DECISIONS.md D16.
- **AgentCard (live)** — `https://mantleflow.vercel.app/.well-known/agent-card.json` (served by
  `web/app/.well-known/agent-card.json/route.ts`); this is the `agentURI` we registered.
- **Deployed event topics (captured live 2026-06-27)** — Identity `MetadataSet` topic0
  `0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b` (topics: agentId, keccak(key));
  Reputation `Feedback` topic0 `0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc`
  (topics: agentId, client, tagHash). Used for receipt-decode provenance verify + reputation reads.
- **Self-feedback forbidden** — `Reputation.giveFeedback` about one's own agentId reverts
  "Self-feedback not allowed". Genuine **third-party reputation exists**: agent 309 has a real rating
  from independent wallet `0xf45149a47658709967D7482724C90c909DD1b751` (avg 5), tx
  `0x40ec59da35e7b01f774fd1828b899c3d7a7250fc9e903cd726567003358a6dc3`.
- **RPC log cap** — Mantle Sepolia `eth_getLogs` caps at ~10k blocks (9000 ok, 45000 rejected);
  reputation reads chunk under this; provenance verify uses the tx receipt (unbounded).

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
- **Settlement asset (production)** — **USDC on Mantle mainnet** `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
  (ON-CHAIN VERIFIED 2026-06-25: code present, 3516-hex bytecode; EIP-3009 per Circle v2). CAIP-2
  network id `eip155:5000`. Mantle is **not** in Coinbase CDP's facilitator list → use QuestFlow.
- **QuestFlow key access (2026-06-27)** — apply via `https://forms.gle/SRdxu8yaQYVj85Jh9`; auth =
  `Authorization: Bearer ${FACILITATOR_API_KEY}`; endpoints `/verify`·`/settle`·`/supported`·`/list`.
  Pluggable via env (`QUESTFLOW_API_KEY`); not required for the Sepolia demo.
- **x402 LIVE (Sepolia demo, 2026-06-27)** — deployed our own EIP-3009 test stablecoin **tmUSD
  `0x246e485a5966b19871f3e9297182f8cb49fd8242`** (Mantle Sepolia, 6 decimals, public faucet `mint`;
  deploy tx `0x486276b9fdc2661fe5c8d7e4313f3a92d78a1fc5afa8e1602c500b6171a86c60`). **Self-settle
  confirmed end-to-end** (mint → buyer signs EIP-3009 → server `transferWithAuthorization` → balances
  moved exactly; replay rejected): sample settlement tx
  `0xc01c89ddf1ebc10fa246e68bba442863455c8e18c6c6257088e1bb14f9e6910a`. EIP-712 domain
  `{name:"MantleFlow Test USD", version:"1", chainId:5003, verifyingContract:tmUSD}`. `X-PAYMENT` =
  base64 `{x402Version:1, scheme:"exact", network:"eip155:5003", payload:{signature, authorization:
  {from,to,value,validAfter,validBefore,nonce}}}`. Gate = `/api/query` only; basic tier free.
- **Note** — the public `rpc.sepolia.mantle.xyz` was intermittently timing out 2026-06-27; switched
  Sepolia reads/writes to the Alchemy endpoint (`MANTLE_SEPOLIA_RPC`) for reliability.

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
- **Composite:** weighted (reachability .25, depth .2, fragmentation .15, borrowability .2, compliance .2, cross-chain .15), renormalised over **computed** sub-scores, with a self-describing note listing which were included/excluded.

---

## 9. Cross-chain reach (confirmed 2026-06-27)

- **LayerZero V2 endpoint on Mantle** = `0x1a44076050125825900e736c501f859c50fE728c` — confirmed via
  on-chain `endpoint()` on **cmETH** and **USDe** (both are LayerZero OFTs). mETH / fBTC / MI4 / USDY
  do **not** expose this endpoint (not OFT on the token contract). Detection = `endpoint()` ==
  this address.
- **Chainlink CCIP on Mantle** — Mantle is a CCIP chain (Router/TokenAdminRegistry per the CCIP
  directory). Its CCIP **token set carries LINK / USDC / USDT / wstETH / W0G** — **none of our tracked
  RWAs** (checked via the CCIP REST API `docs.chain.link/api/ccip/v1/tokens?environment=mainnet&chainId=5000`,
  2026-06-27). A real distribution finding: RWAs travel via LayerZero or not at all, not CCIP.
- **Cost** is per-tx dynamic for both CCIP and LayerZero → reported "not quoted" (never fabricated).
- **OFT routes confirmed live 2026-06-27:** cmETH + USDe → cross-chain sub-score **computed, value 70**
  (LayerZero-OFT available, CCIP not). mETH / MI4 → **insufficient-data** (both channels probed, none
  available). The map/Routes UI reflect this exactly.

## 10. Accuracy refinements + dual-network (confirmed 2026-06-27)

- **DefiLlama `exposure` classifies swap vs yield** — the `/pools` payload carries `exposure`
  (`multi` = a 2-sided AMM/trading pool; `single` = a single-asset deposit = yield/lending/vault).
  Verified live across all 37 Mantle pools: only **`fluxion-network` is `multi`**; `aave-v3`,
  `woofi-earn`, `circuit-protocol`, `ondo-yield-assets`, `clearpool-lending`, etc. are all `single`.
  Per-asset: MI4 = 0 pools; mETH = woofi-earn + circuit-protocol (both `single`/yield); cmETH =
  woofi-earn (yield); fBTC/USDe = aave-v3 (yield); USDY = ondo-yield-assets (yield). ⇒ **none of the
  six tracked assets has a genuine secondary TRADING venue via probed venues** (Merchant Moe v2
  `getPair` + DefiLlama AMM pools). Reachability/depth/fragmentation now count swap venues only; yield
  positions are surfaced separately. (D24.)
- **Borrowability now reflects frozen reserves** — mETH's Lendle reserve is **FROZEN**; the sub-score
  returns **20** (was ~91 from LTV) so it no longer contradicts the on-chain frozen flag. (D25.)
- **Live engine read (2026-06-27, post-fix):** MI4 → composite **5** (gated + no trading venue + not
  borrowable); mETH → composite **34** (reachability 0, borrowability 20 frozen, compliance 90 open).
- **Compliance tiers (D26) — on-chain ABI reads, 2026-06-27.** Three tiers, not a binary:
  permissioned (allowlist → score 15, "GATED"), restrictable (blocklist/sanctions → 60, "BLOCKABLE"),
  open (90). Verified per asset (effective/impl ABI via Etherscan V2): **MI4** = GATED (Securitize
  allowlist); **fBTC** = BLOCKABLE (`lockUser`/`userBlocked`); **mETH** = BLOCKABLE
  (`isBlocked`/`getBlockLists`/`addBlockListContract`); **cmETH** = BLOCKABLE (`isSanctioned`/
  `sanctionsList`/`blocklist`); **USDY** = BLOCKABLE (`blocklist`/`setBlocklist`); **USDe** = OPEN
  (`allowance`-only, no hooks). Global `pause`/`unpause` is intentionally NOT counted as gating.
  Post-fix composites: MI4 5, USDY 18, mETH 25, fBTC 25, cmETH 33, USDe 41.
- **Etherscan reliability:** fBTC's getsourcecode (~88KB source) intermittently failed Node `fetch`;
  the adapter now falls back to the lighter `getabi` (~10KB) so fBTC compliance resolves. The composite
  is suppressed (shown "—") when < 3 of 6 sub-scores compute, so a transient unread axis never renders a
  misleading hard "0/100".
- **Dual-network capability** — ERC-8004 identity/provenance/reputation are network-selectable via
  `ERC8004_NETWORK` (independent of `x402Network`, which stays Sepolia). Mainnet registries (§3) are
  wired. **Code default `sepolia`** so the live deployment never breaks before the env is flipped.
- **MAINNET IDENTITY REGISTERED + topic0 parity CONFIRMED (2026-06-27)** — agent wallet funded 2.2 MNT;
  **registered agentId `141` on Mantle mainnet (5000)**, register tx
  `0x7a210524cb616b4731b6a95debaac1bcbfa4071abf90eff08b4dc1a7dea802e0`. `ownerOf(141)` = agent wallet
  `0x8974881E39a5eF62214929B6CaA6EC0C6e7D47c7`, `tokenURI(141)` = the AgentCard URL. Provenance write
  (MI4 result, `setMetadata`) tx `0xa32b40e25f15553062c0871ebcc374a2959856caddf2e361cd39d79f8114a4ff`
  (block 97263717) — **`verifyAttestation` decoded the MetadataSet event by topic0 against the mainnet
  Identity registry and returned `verified: true`**, proving the mainnet registry emits the SAME
  `MetadataSet` topic0 as Sepolia (the D23 verification gate). Reputation read path returns count 0
  (no third-party feedback yet) without error. resultHash(MI4) at registration:
  `0x29f4b0e2929eff8bc80decca76a76d9e11937ffe2b3e254c43e819e56d6126db`.
- **Go-live (owner action):** set on Vercel (Production) **BOTH** `ERC8004_NETWORK=mainnet` and
  `AGENT_ID=141` (they must change together — `AGENT_ID` 309 is a Sepolia id), then deploy the
  dual-network code. Sepolia agentId 309 + its registries remain valid for reference.

## §6. Open items to close (non-blocking for architecture lock)

1. **Research Challenge rubric/submission page** — not web-indexed. Resolve the t.co from the
   2026-06-16 post / check group.mantle.xyz; confirm tracks (incl. "Track 2 — The Research Agent"),
   judging axes, submission mechanics, and the AI Agent Skills bonus wording before Phase 6 submit.
2. **x402 / QuestFlow** — facilitator **confirmed LIVE on Mantle** (`https://facilitator.questflow.ai`,
   Bearer `FACILITATOR_API_KEY`, USDC/EIP-3009; "Mantle on x402" announced). Still to confirm before
   building: exact `/verify`·/`settle` JSON schemas + Mantle USDC `payTo`/amount semantics (needs the
   API key). Plan = gate a premium tier; basic queries stay free; fallback = own minimal Sepolia
   facilitator. (Phase 4 build — planned, not yet implemented.)
3. **Agent Scaffold repo / Mantle skill registration path** — locate before Phase 3; fallback is
   plain SKILL.md + MCP.
4. **MI4 implementation contract** — resolve the proxy's implementation slot and inspect its ABI/
   bytecode for the exact transfer-restriction / allowlist hooks (Phase 1 compliance module).
