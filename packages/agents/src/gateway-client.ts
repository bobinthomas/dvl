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
 * Routes through the Cloudflare AI Gateway's OpenAI-compatible endpoint —
 * never a provider SDK directly — so swapping
 * "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast" for
 * "anthropic/claude-sonnet-4-5" is a DS_MODEL env var change, nothing else.
 * See direct-client.ts for the sibling `ModelClient` that calls a
 * Groq/OpenRouter/Kimi key directly instead of the Gateway.
 */
export function createGatewayClient(env: GatewayEnv): ModelClient {
  // gateway.ai.cloudflare.com authenticates an "Authenticated Gateway" via
  // the cf-aig-authorization header, not the standard Authorization header
  // the OpenAI SDK sends for its `apiKey` — see
  // https://developers.cloudflare.com/ai-gateway/configuration/authentication/.
  // apiKey is kept too: harmless (and required by the SDK's types), and
  // covers a gateway with Authenticated Gateway left off, where the
  // standard header is simply ignored rather than rejected.
  const client = new OpenAI({
    baseURL: gatewayBaseUrl(env),
    apiKey: env.apiToken,
    defaultHeaders: { "cf-aig-authorization": `Bearer ${env.apiToken}` },
  });

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
      return coerceMessageContent(content);
    },
  };
}

/**
 * The OpenAI SDK's own types say `message.content` is always a plain
 * string, but that's an assumption about OpenAI's own wire format —
 * Cloudflare AI Gateway's compat layer, fronting a Workers AI model, isn't
 * guaranteed to match it exactly for every model/response-format
 * combination. Confirmed live: content coming back as something callModel's
 * `.trim()` (see call-model.ts's stripCodeFence) can't call directly —
 * either an array of content parts (a shape some OpenAI-compatible APIs use
 * for multi-part messages) or, if the gateway already parsed the
 * json_schema response itself, a plain object. Both are coerced back to the
 * JSON string callModel expects; anything else is stringified as a
 * last resort rather than thrown, since a malformed string still fails
 * schema validation with a clear message instead of crashing here.
 */
function coerceMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : ((part as { text?: string })?.text ?? "")))
      .join("");
  }
  if (typeof content === "object") return JSON.stringify(content);
  return String(content);
}
