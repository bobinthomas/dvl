/**
 * The agent route BUILD-PROMPT's stack section requires: API keys never
 * ship in client-side code, so the docs Q&A agent runs here, server-side,
 * reading its Cloudflare AI Gateway credentials from Worker secrets — never
 * from anything bundled into the Vite app the browser downloads.
 */
import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core";
import { createGatewayClient, loadGatewayEnv, answerDocsQuestion, ModelOutputError } from "@ds-platform/agents";
import { rawSpecs } from "./specs.js";

export interface Env {
  ASSETS: Fetcher;
  CF_AI_GATEWAY_ACCOUNT_ID: string;
  CF_AI_GATEWAY_ID: string;
  CF_AI_GATEWAY_TOKEN: string;
  DS_MODEL: string;
}

const specs: ComponentSpec[] = rawSpecs.map((raw) => ComponentSpecSchema.parse(raw));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  let question: string;
  try {
    const body = (await request.json()) as { question?: unknown };
    if (typeof body.question !== "string" || body.question.trim().length === 0) {
      return json({ error: 'expected a JSON body of the form { "question": string }' }, 400);
    }
    question = body.question;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  let gatewayEnv;
  try {
    gatewayEnv = loadGatewayEnv({
      CF_AI_GATEWAY_ACCOUNT_ID: env.CF_AI_GATEWAY_ACCOUNT_ID,
      CF_AI_GATEWAY_ID: env.CF_AI_GATEWAY_ID,
      CF_AI_GATEWAY_TOKEN: env.CF_AI_GATEWAY_TOKEN,
      DS_MODEL: env.DS_MODEL,
    });
  } catch (err) {
    // The specific missing var is a server misconfiguration, not something
    // the client can act on — log it, don't leak it in the response.
    console.error((err as Error).message);
    return json({ error: "the docs assistant is not configured" }, 503);
  }

  const client = createGatewayClient(gatewayEnv);

  try {
    const answer = await answerDocsQuestion(client, gatewayEnv.model, specs, question);
    return json(answer);
  } catch (err) {
    if (err instanceof ModelOutputError) {
      console.error(err.message);
      return json({ error: "the docs assistant couldn't produce a valid answer — try rephrasing" }, 502);
    }
    throw err;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/ask" && request.method === "POST") {
      return handleAsk(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
