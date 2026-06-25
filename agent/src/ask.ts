/**
 * Live NL demo: run a natural-language query through the DeepSeek tool-use orchestrator.
 * Usage: pnpm -C agent ask "I hold $1M of MI4 — where can I exit it and am I gated?"
 */
import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadConfig } from "./config/env.js";
import { runQuery } from "./orchestrator/orchestrator.js";

loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

async function main() {
  const query =
    process.argv.slice(2).join(" ") ||
    "I hold $1M of MI4 — where can I exit it, what can I borrow against it, and am I gated?";
  const config = loadConfig(process.env);
  console.log(`\nQ: ${query}\n`);
  const { answer, toolCalls, map } = await runQuery(config, query);
  console.log("Tool calls:", toolCalls.map((t) => t.name).join(" → "));
  console.log(`\nA: ${answer}\n`);
  if (map) console.log("Headlines:", map.headlines.join(" | "));
}

main().catch((err) => {
  console.error("ask failed:", err);
  process.exit(1);
});
