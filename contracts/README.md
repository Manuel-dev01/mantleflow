# /contracts — Foundry (used only when we deploy)

For MI4 and the ERC-8004 registries we **read existing** on-chain contracts (no deploy needed; see
`docs/VERIFIED.md`). This package exists for anything we author/deploy ourselves — e.g. a minimal
x402 facilitator on Sepolia (fallback, Phase 4) or an ERC-8004 Validation Registry instance if
required. Comprehensive Foundry tests; Sepolia first; record any deployed address in VERIFIED.md.
