import { type AppConfig } from "../config/env.js";
import { buildChallenge } from "./challenge.js";
import { verifyAndSettle } from "./settle.js";
import { type X402Challenge, type Settlement } from "./types.js";

export * from "./types.js";
export { buildChallenge, X402_NETWORKS, X402_ASSET_DOMAIN, X402_VERSION } from "./challenge.js";
export { verifyAndSettle, decodePayment } from "./settle.js";

export type PaymentGate =
  | { free: true }
  | { challenge: X402Challenge }
  | { settlement: Settlement };

/** Is x402 fully configured + enabled on this deployment? */
export function x402Active(config: AppConfig): boolean {
  return Boolean(config.x402Enabled && config.x402Asset && config.x402PayTo);
}

/**
 * Gate a resource. Returns `free` when x402 is off (app still works unconfigured), a `challenge`
 * to send as 402 when there's no payment, or a settled `settlement` when the X-PAYMENT verifies.
 */
export async function requirePayment(
  config: AppConfig,
  xPaymentHeader: string | null,
  resource: string,
): Promise<PaymentGate> {
  if (!x402Active(config)) return { free: true };
  if (!xPaymentHeader) return { challenge: buildChallenge(config, resource) };
  const settlement = await verifyAndSettle(config, xPaymentHeader, resource);
  return { settlement };
}
