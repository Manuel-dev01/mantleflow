/**
 * @mantleflow/agent — core library for the MantleFlow distribution-mapping research agent.
 *
 * This package holds the orchestrator, data adapters, the Distribution Score engine, the
 * x402 middleware, and the ERC-8004 client. It is consumed by the Next.js web API routes
 * and by the MCP server entrypoint. Phase 0 scaffold: configuration + the accuracy invariant.
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
export { cpmmSlippagePct, STANDARD_CLEAR_SIZE_USD } from "./dex/slippage.js";
export { type LendleReserve } from "./adapters/lendle.js";
export { createCapabilities, type Capabilities } from "./capabilities.js";
export { runQuery, type QueryResult } from "./orchestrator/orchestrator.js";
