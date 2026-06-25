import { z } from "zod";

/**
 * Runtime configuration. The /agent library stays pure: it never reads process.env itself.
 * The web API route (or a CLI) builds an AppConfig and passes it into the capability factory.
 */
export const AppConfigSchema = z.object({
  anthropicApiKey: z.string().min(1).optional(),
  etherscanApiKey: z.string().min(1).optional(),
  mantleMainnetRpc: z.string().url().default("https://rpc.mantle.xyz"),
  mantleSepoliaRpc: z.string().url().default("https://rpc.sepolia.mantle.xyz"),
  /** Orchestrator model. Default: Claude Opus 4.8 (per the claude-api skill). */
  orchestratorModel: z.string().default("claude-opus-4-8"),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/** Build an AppConfig from a plain env-like record (e.g. process.env at the app boundary). */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  return AppConfigSchema.parse({
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    etherscanApiKey: env.ETHERSCAN_API_KEY,
    mantleMainnetRpc: env.MANTLE_MAINNET_RPC ?? undefined,
    mantleSepoliaRpc: env.MANTLE_SEPOLIA_RPC ?? undefined,
    orchestratorModel: env.ORCHESTRATOR_MODEL ?? undefined,
  });
}
