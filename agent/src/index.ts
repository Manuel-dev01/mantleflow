/**
 * @mantleflow/agent — core library for the MantleFlow distribution-mapping research agent.
 *
 * This package holds the orchestrator, data adapters, the Distribution Score engine, the
 * x402 middleware, and the ERC-8004 client. It is consumed by the Next.js web API routes
 * and by the MCP server entrypoint. Provides configuration and the accuracy invariant.
 */

export * from "./types/source-receipt.js";
export * from "./config/chains.js";
export * from "./config/addresses.js";
export * from "./config/env.js";
export * from "./engine/types.js";
export { assembleDistributionMap } from "./engine/engine.js";
export { detectGatesFromFunctions, checkComplianceGate } from "./modules/compliance.js";
export { findSecondaryVenues, type ReachabilityResult } from "./dex/reachability.js";
export { analyzeLiquidity, type VenueLiquidity, type LiquidityResult } from "./dex/depth.js";
export {
  createGeckoTerminalAdapter,
  type GeckoTerminalAdapter,
  type GtPool,
  type GtPoolsResult,
  type GtTokenMarket,
} from "./adapters/geckoterminal.js";
export { cpmmSlippagePct, STANDARD_CLEAR_SIZE_USD } from "./dex/slippage.js";
export {
  findCrossChainRoutes,
  type CrossChainReach,
  type CrossChainRoute,
  type CrossChainProtocol,
} from "./adapters/crosschain.js";
export { type LendleReserve } from "./adapters/lendle.js";
export { createCapabilities, type Capabilities } from "./capabilities.js";
export { runQuery, type QueryResult } from "./orchestrator/orchestrator.js";
export {
  createErc8004Reader,
  createErc8004Writer,
  hashResult,
  metadataLogMatches,
  type LogLike,
  type Erc8004Reader,
  type Erc8004Writer,
  type IdentityView,
  type ReputationView,
  type RegisterResult,
  type AttestResult,
  type AttestInput,
} from "./erc8004/client.js";
export { IDENTITY_ABI, REPUTATION_ABI, PROVENANCE_TAG1 } from "./erc8004/abis.js";
export {
  requirePayment,
  x402Active,
  buildChallenge,
  verifyAndSettle,
  decodePayment,
  X402_NETWORKS,
  X402_ASSET_DOMAIN,
  X402_VERSION,
  type PaymentGate,
  type X402Challenge,
  type X402Accept,
  type PaymentPayload,
  type Authorization,
  type Settlement,
} from "./x402/index.js";
