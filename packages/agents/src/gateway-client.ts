import OpenAI from "openai";
import { gatewayBaseUrl, type GatewayEnv } from "./env.js";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface CompleteArgs {
  model: string;
  messages: ChatMessage[];
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}

/**
 * The seam between agent logic and the model provider. Every agent talks to
 * this interface, never to the `openai` client directly — that's what makes
 * `callModel`'s retry/validate loop testable with a fake, and what keeps
 * provider-switching to an env var change (BUILD-PROMPT's stack rule):
 * nothing above this file knows or cares that the transport happens to be
 * OpenAI's SDK pointed at Cloudflare's gateway.
 */
export interface ModelClient {
  complete(args: CompleteArgs): Promise<string>;
}

/**
 * The only file in this package that imports the `openai` npm package.
 * Routes through the Cloudflare AI Gateway's OpenAI-compatible endpoint —
 * never a provider SDK directly — so swapping
 * "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast" for
 * "anthropic/claude-sonnet-4-5" is a DS_MODEL env var change, nothing else.
 */
export function createGatewayClient(env: GatewayEnv): ModelClient {
  const client = new OpenAI({ baseURL: gatewayBaseUrl(env), apiKey: env.apiToken });

  return {
    async complete({ model, messages, schemaName, jsonSchema }) {
      const completion = await client.chat.completions.create({
        model,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, schema: jsonSchema, strict: true },
        },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`gateway returned no content for model "${model}"`);
      }
      return content;
    },
  };
}
