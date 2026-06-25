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
  });
}
