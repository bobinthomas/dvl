/**
 * Every model call goes through the Cloudflare AI Gateway's OpenAI-compatible
 * endpoint — never a provider SDK directly. Switching providers is meant to
 * be an env var change and nothing else, so all of that lives here in one
 * place, read once.
 */
export interface GatewayEnv {
  /** Cloudflare account id — first path segment after /v1/ in the gateway URL. */
  accountId: string;
  /** The AI Gateway's own id — second path segment. */
  gatewayId: string;
  /** Cloudflare API token (or AI Gateway token) sent as the bearer credential. */
  apiToken: string;
  /** `{provider}/{model}`, e.g. "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast" or "anthropic/claude-sonnet-4-5". */
  model: string;
}

export class MissingGatewayEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `missing environment variable(s) for the AI Gateway: ${missing.join(", ")}. ` +
        `Set CF_AI_GATEWAY_ACCOUNT_ID, CF_AI_GATEWAY_ID, CF_AI_GATEWAY_TOKEN, and DS_MODEL.`
    );
    this.name = "MissingGatewayEnvError";
  }
}

/**
 * `Record<string, string | undefined>` rather than `NodeJS.ProcessEnv`
 * deliberately — this reads identically from Node's `process.env` (the CLI)
 * and a Cloudflare Worker's `env` bindings object (the docs Q&A route),
 * with no nodejs_compat polyfill needed for the Worker case.
 */
export function loadGatewayEnv(env: Record<string, string | undefined> = process.env): GatewayEnv {
  const accountId = env.CF_AI_GATEWAY_ACCOUNT_ID;
  const gatewayId = env.CF_AI_GATEWAY_ID;
  const apiToken = env.CF_AI_GATEWAY_TOKEN;
  const model = env.DS_MODEL;

  const missing = [
    !accountId && "CF_AI_GATEWAY_ACCOUNT_ID",
    !gatewayId && "CF_AI_GATEWAY_ID",
    !apiToken && "CF_AI_GATEWAY_TOKEN",
    !model && "DS_MODEL",
  ].filter((v): v is string => !!v);

  if (missing.length > 0) throw new MissingGatewayEnvError(missing);

  return { accountId: accountId!, gatewayId: gatewayId!, apiToken: apiToken!, model: model! };
}

/** The gateway's OpenAI-compatible base URL for this account + gateway. */
export function gatewayBaseUrl(env: Pick<GatewayEnv, "accountId" | "gatewayId">): string {
  return `https://gateway.ai.cloudflare.com/v1/${env.accountId}/${env.gatewayId}/compat`;
}
