import {
  createDirectClient,
  createGatewayClient,
  loadGatewayEnv,
  type DirectProviderConfig,
  type GatewayEnv,
  type ModelClient,
} from "@ds-platform/agents";
import { createFigmaRestClient, loadFigmaEnv, type FigmaClient, type FigmaEnv } from "@ds-platform/figma-client";

export interface WorkerEnv {
  CF_AI_GATEWAY_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
  CF_AI_GATEWAY_TOKEN?: string;
  DS_MODEL?: string;
  FIGMA_ACCESS_TOKEN?: string;
}

export interface ResolvedClient {
  client: ModelClient;
  model: string;
}

/**
 * Same three-way priority as dev-server/resolve-client.ts (a pasted direct
 * key, a pasted Gateway config, then this environment's own credentials) —
 * just reading the last one from Worker secrets (`env`) instead of
 * `process.env`, since nothing here can assume Node populates that global.
 */
export function resolveModelClient(
  env: WorkerEnv,
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
    const resolvedEnv = loadGatewayEnv({
      CF_AI_GATEWAY_ACCOUNT_ID: env.CF_AI_GATEWAY_ACCOUNT_ID,
      CF_AI_GATEWAY_ID: env.CF_AI_GATEWAY_ID,
      CF_AI_GATEWAY_TOKEN: env.CF_AI_GATEWAY_TOKEN,
      DS_MODEL: env.DS_MODEL,
    });
    return { client: createGatewayClient(resolvedEnv), model: resolvedEnv.model };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export function resolveFigmaClient(env: WorkerEnv, figmaConfig?: FigmaEnv): { client: FigmaClient } | { error: string } {
  if (figmaConfig?.accessToken) {
    return { client: createFigmaRestClient(figmaConfig) };
  }
  try {
    const resolvedEnv = loadFigmaEnv({ FIGMA_ACCESS_TOKEN: env.FIGMA_ACCESS_TOKEN });
    return { client: createFigmaRestClient(resolvedEnv) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
