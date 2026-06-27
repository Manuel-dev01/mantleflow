import { z } from "zod";

/**
 * Runtime configuration. The /agent library stays pure: it never reads process.env itself.
 * The web API route (or a CLI) builds an AppConfig and passes it into the capability factory.
 */
export const AppConfigSchema = z.object({
  etherscanApiKey: z.string().min(1).optional(),
  mantleMainnetRpc: z.string().url().default("https://rpc.mantle.xyz"),
  mantleSepoliaRpc: z.string().url().default("https://rpc.sepolia.mantle.xyz"),
  /** Orchestrator LLM (OpenAI-compatible; DeepSeek by default). */
  llmApiKey: z.string().min(1).optional(),
  llmBaseUrl: z.string().url().default("https://api.deepseek.com"),
  llmModel: z.string().default("deepseek-v4-flash"),
  /**
   * ERC-8004 agent signing key (Mantle Sepolia, testnet-only). Optional — all identity reads and
   * the rest of the app degrade gracefully without it; only on-chain writes (register / provenance
   * receipt) require it. Validated as a 0x-prefixed 32-byte hex private key.
   */
  agentPrivateKey: z
    .string()
    .regex(/^(0x)?[0-9a-fA-F]{64}$/, "AGENT_PRIVATE_KEY must be a 32-byte hex key (0x prefix optional)")
    .transform((k) => (k.startsWith("0x") ? k : `0x${k}`))
    .optional(),
  /** The agent's ERC-8004 token id, set after registration (string to avoid bigint coercion). */
  agentId: z.string().regex(/^\d+$/).optional(),
  /** Stable https AgentCard URI (served by the web app at /.well-known/agent-card.json). */
  agentCardUrl: z
    .string()
    .url()
    .default("https://mantleflow.vercel.app/.well-known/agent-card.json"),

  // --- x402 pay-per-query ---
  /** Master switch. When false (or asset/payTo unset) the gated endpoint runs free. */
  x402Enabled: z.boolean().default(false),
  /** Settlement network — sepolia (tmUSD test token) by default; mainnet (USDC) for production. */
  x402Network: z.enum(["mainnet", "sepolia"]).default("sepolia"),
  /** EIP-3009 settlement token address (tmUSD on Sepolia, or USDC on mainnet). */
  x402Asset: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  /** Recipient of the payment (the agent treasury wallet). */
  x402PayTo: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  /** Price in the token's smallest unit (6-decimals: 10000 = 0.01). */
  x402PriceAtomic: z.string().regex(/^\d+$/).default("10000"),
  /** Pluggable QuestFlow facilitator (used instead of self-settle when the key is present). */
  questflowFacilitatorUrl: z.string().url().default("https://facilitator.questflow.ai"),
  questflowApiKey: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/** Build an AppConfig from a plain env-like record (e.g. process.env at the app boundary). */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  return AppConfigSchema.parse({
    etherscanApiKey: env.ETHERSCAN_API_KEY,
    mantleMainnetRpc: env.MANTLE_MAINNET_RPC ?? undefined,
    mantleSepoliaRpc: env.MANTLE_SEPOLIA_RPC ?? undefined,
    llmApiKey: env.LLM_API_KEY,
    llmBaseUrl: env.LLM_BASE_URL ?? undefined,
    llmModel: env.LLM_MODEL ?? undefined,
    agentPrivateKey: env.AGENT_PRIVATE_KEY,
    agentId: env.AGENT_ID,
    agentCardUrl: env.AGENT_CARD_URL ?? undefined,
    x402Enabled: env.X402_ENABLED === "true",
    x402Network: env.X402_NETWORK ?? undefined,
    x402Asset: env.X402_ASSET,
    x402PayTo: env.X402_PAY_TO,
    x402PriceAtomic: env.X402_PRICE ?? undefined,
    questflowFacilitatorUrl: env.QUESTFLOW_FACILITATOR_URL ?? undefined,
    questflowApiKey: env.QUESTFLOW_API_KEY,
  });
}
