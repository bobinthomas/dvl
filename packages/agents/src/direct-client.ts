import OpenAI from "openai";
import type { ChatMessage, CompleteArgs, ModelClient } from "./gateway-client.js";

export type DirectProvider = "groq" | "openrouter" | "kimi";

export interface DirectProviderConfig {
  provider: DirectProvider;
  apiKey: string;
  model: string;
}

/** OpenAI-compatible base URLs, for casual local testing with a key the user supplies themselves — never Cloudflare AI Gateway. */
export const DIRECT_PROVIDER_INFO: Record<DirectProvider, { label: string; baseUrl: string; modelPlaceholder: string }> = {
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", modelPlaceholder: "llama-3.3-70b-versatile" },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    modelPlaceholder: "meta-llama/llama-3.3-70b-instruct",
  },
  kimi: { label: "Kimi (Moonshot AI)", baseUrl: "https://api.moonshot.ai/v1", modelPlaceholder: "moonshot-v1-8k" },
};

/**
 * Appends the JSON Schema as explicit instruction text rather than relying
 * on `response_format: json_schema` strict mode — Groq/OpenRouter/Kimi don't
 * reliably support that (see createDirectClient's doc comment). Pure and
 * network-free so it's unit-testable on its own.
 */
export function withSchemaInstruction(
  messages: ChatMessage[],
  schemaName: string,
  jsonSchema: Record<string, unknown>
): ChatMessage[] {
  const instruction: ChatMessage = {
    role: "user",
    content: `Respond with a JSON object only — no prose, no markdown code fences — matching this JSON Schema exactly (schema name "${schemaName}"):\n\n${JSON.stringify(jsonSchema)}`,
  };
  return [...messages, instruction];
}

/**
 * A second `ModelClient` implementation, for calling Groq/OpenRouter/Kimi
 * directly with a key the user pastes into the docs app's browser UI —
 * sibling to createGatewayClient, not a replacement for it. Uses
 * `response_format: json_object` (broadly supported) plus the schema
 * appended as prompt text, rather than OpenAI's strict `json_schema` mode:
 * that mode is inconsistently supported across these three providers, and
 * an unsupported response_format typically fails the HTTP call itself
 * (outside callModel's parse/validate retry loop) rather than degrading
 * gracefully. The real enforcement is callModel's existing
 * parse-then-Zod-validate-then-retry-once loop, which never depended on
 * response_format being honored server-side in the first place.
 */
export function createDirectClient(config: DirectProviderConfig): ModelClient {
  const client = new OpenAI({ baseURL: DIRECT_PROVIDER_INFO[config.provider].baseUrl, apiKey: config.apiKey });

  return {
    async complete({ model, messages, schemaName, jsonSchema }: CompleteArgs) {
      const completion = await client.chat.completions.create({
        model,
        messages: withSchemaInstruction(messages, schemaName, jsonSchema),
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`${config.provider} returned no content for model "${model}"`);
      }
      return content;
    },
  };
}
