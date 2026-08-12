import {
  createDirectClient,
  createGatewayClient,
  loadGatewayEnv,
  type DirectProviderConfig,
  type GatewayEnv,
  type ModelClient,
} from "@ds-platform/agents";
import { createFigmaRestClient, loadFigmaEnv, type FigmaClient, type FigmaEnv } from "@ds-platform/figma-client";

export interface ResolvedClient {
  client: ModelClient;
  model: string;
}

/**
 * Three ways to get a model client, tried in order: a direct-provider key
 * pasted into the docs app's Settings page, a Cloudflare AI Gateway config
 * pasted into the same page, then this machine's CF_AI_GATEWAY_* env vars
 * (unchanged from before this feature existed). Every dev-api handler that
 * needs a model client goes through this instead of calling
 * loadGatewayEnv()/createGatewayClient() directly.
 */
export function resolveModelClient(
  providerConfig?: DirectProviderConfig,
  gatewayConfig?: GatewayEnv
): ResolvedClient | { error: string } {
  if (providerConfig?.apiKey && providerConfig.model) {
    return { client: createDirectClient(providerConfig), model: providerConfig.model };
  }
  if (gatewayConfig?.accountId && gatewayConfig.gatewayId && gatewayConfig.apiToken && gatewayConfig.model) {
    return { client: createGatewayClient(gatewayConfig), model: gatewayConfig.model };
  }
  try {
    const env = loadGatewayEnv();
    return { client: createGatewayClient(env), model: env.model };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Same priority order as resolveModelClient: a Figma token pasted into the
 * Settings page wins, otherwise falls back to this machine's
 * FIGMA_ACCESS_TOKEN env var, unchanged from before this feature existed.
 */
export function resolveFigmaClient(figmaConfig?: FigmaEnv): { client: FigmaClient } | { error: string } {
  if (figmaConfig?.accessToken) {
    return { client: createFigmaRestClient(figmaConfig) };
  }
  try {
    const env = loadFigmaEnv();
    return { client: createFigmaRestClient(env) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
