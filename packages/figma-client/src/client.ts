import type { FigmaEnv } from "./env.js";

/**
 * Minimal shape of a Figma file's node tree — only the fields reconcile.ts
 * actually reads. The real API returns far more (fills, effects, layout
 * constraints, etc.); we deliberately don't model any of that here.
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  boundVariables?: Record<string, unknown>;
}

export interface FigmaFileNode {
  name: string;
  document: FigmaNode;
}

export interface FigmaVariablesResponse {
  meta: {
    variables: Record<string, { id: string; name: string; resolvedType: string }>;
    variableCollections: Record<string, { id: string; name: string }>;
  };
}

/**
 * The DI seam for `ds request verify` — plays the same role `ModelClient`
 * plays for the AI Gateway (@ds-platform/agents/gateway-client.ts): every
 * caller talks to this interface, never to `fetch` directly, so tests never
 * hit the real Figma API.
 */
export interface FigmaClient {
  getFile(fileKey: string): Promise<FigmaFileNode>;
  getLocalVariables(fileKey: string): Promise<FigmaVariablesResponse>;
}

const FIGMA_API_BASE = "https://api.figma.com/v1";

/**
 * Per BUILD-PROMPT (see packages/figma-plugin), the Figma REST API cannot
 * create components — only the Plugin API can, which is why building a
 * component runs inside a real Figma plugin instead of calling this. This
 * client exists for the opposite direction: reading a file the plugin (or a
 * human) already built, which the REST API can do fine.
 */
export function createFigmaRestClient(env: FigmaEnv): FigmaClient {
  async function request<T>(path: string): Promise<T> {
    const res = await fetch(`${FIGMA_API_BASE}${path}`, {
      headers: { "X-Figma-Token": env.accessToken },
    });
    if (!res.ok) {
      throw new Error(`Figma API request to ${path} failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  return {
    getFile: (fileKey) => request<FigmaFileNode>(`/files/${fileKey}`),
    getLocalVariables: (fileKey) => request<FigmaVariablesResponse>(`/files/${fileKey}/variables/local`),
  };
}
