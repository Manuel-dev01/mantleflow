import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { type AppConfig } from "../config/env.js";
import { createCapabilities } from "../capabilities.js";
import { type DistributionMap } from "../engine/types.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { TOOL_DEFS, type ToolContext, runTool } from "./tools.js";

export interface QueryResult {
  answer: string;
  /** The structured map gathered during the run (source of truth for the UI). */
  map: DistributionMap | undefined;
  toolCalls: { name: string; args: string }[];
}

/**
 * Run a natural-language query through the DeepSeek (OpenAI-compatible) tool-use loop. The model
 * plans which capabilities to call; we execute them against live Mantle data and feed results back.
 * The structured DistributionMap is captured separately and is the authoritative artifact.
 */
export async function runQuery(config: AppConfig, userQuery: string): Promise<QueryResult> {
  if (!config.llmApiKey) throw new Error("LLM_API_KEY required for the orchestrator");
  const client = new OpenAI({ apiKey: config.llmApiKey, baseURL: config.llmBaseUrl });
  const ctx: ToolContext = { caps: createCapabilities(config), collected: {} };
  const toolCalls: QueryResult["toolCalls"] = [];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userQuery },
  ];

  for (let turn = 0; turn < 6; turn++) {
    const res = await client.chat.completions.create({
      model: config.llmModel,
      messages,
      tools: TOOL_DEFS,
      tool_choice: "auto",
      temperature: 0,
    });
    const msg = res.choices[0]?.message;
    if (!msg) break;
    messages.push(msg as ChatCompletionMessageParam);

    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* leave empty */
        }
        toolCalls.push({ name: tc.function.name, args: tc.function.arguments });
        const out = await runTool(tc.function.name, args, ctx);
        messages.push({ role: "tool", tool_call_id: tc.id, content: out });
      }
      continue;
    }

    return { answer: msg.content ?? "", map: ctx.collected.map, toolCalls };
  }

  return {
    answer: "I wasn't able to complete the research within the step budget.",
    map: ctx.collected.map,
    toolCalls,
  };
}
