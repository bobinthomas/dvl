import * as React from "react";

const STORAGE_KEY = "ds-provider-config";

export type DirectProvider = "groq" | "openrouter" | "kimi";

/**
 * Label + placeholder model per provider, for the settings page's
 * <select>/<input placeholder>. Duplicated here rather than imported from
 * @ds-platform/agents — that package transitively pulls in the `openai`
 * npm SDK and `process.env` reads (gateway-client.ts/env.ts), which have no
 * business entering the browser bundle just for three label strings. Same
 * boundary RequestForm.tsx already draws by importing only
 * @ds-platform/core/schema, never the Node-touching parts of @ds-platform/core.
 */
export const PROVIDER_INFO: Record<DirectProvider, { label: string; modelPlaceholder: string }> = {
  groq: { label: "Groq", modelPlaceholder: "llama-3.3-70b-versatile" },
  openrouter: { label: "OpenRouter", modelPlaceholder: "meta-llama/llama-3.3-70b-instruct" },
  kimi: { label: "Kimi (Moonshot AI)", modelPlaceholder: "moonshot-v1-8k" },
};

interface StoredConfig {
  provider: DirectProvider;
  apiKey: string;
  model: string;
  gatewayAccountId: string;
  gatewayGatewayId: string;
  gatewayToken: string;
  gatewayModel: string;
  figmaAccessToken: string;
}

const DEFAULT_CONFIG: StoredConfig = {
  provider: "groq",
  apiKey: "",
  model: "",
  gatewayAccountId: "",
  gatewayGatewayId: "",
  gatewayToken: "",
  gatewayModel: "",
  figmaAccessToken: "",
};

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function loadStoredConfig(): StoredConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider in PROVIDER_INFO ? parsed.provider : DEFAULT_CONFIG.provider,
      apiKey: str(parsed.apiKey),
      model: str(parsed.model),
      gatewayAccountId: str(parsed.gatewayAccountId),
      gatewayGatewayId: str(parsed.gatewayGatewayId),
      gatewayToken: str(parsed.gatewayToken),
      gatewayModel: str(parsed.gatewayModel),
      figmaAccessToken: str(parsed.figmaAccessToken),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export interface DirectProviderConfig {
  provider: DirectProvider;
  apiKey: string;
  model: string;
}

export interface GatewayConfig {
  accountId: string;
  gatewayId: string;
  apiToken: string;
  model: string;
}

interface ProviderSettingsState extends StoredConfig {
  setProvider: (provider: DirectProvider) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setGatewayAccountId: (v: string) => void;
  setGatewayGatewayId: (v: string) => void;
  setGatewayToken: (v: string) => void;
  setGatewayModel: (v: string) => void;
  setFigmaAccessToken: (v: string) => void;
  /**
   * undefined unless apiKey is set — the "not configured, try the next
   * credential path" case every generate-with-AI fetch body checks before
   * including it. `model` falls back to the provider's placeholder so
   * leaving the Model field blank after pasting a key still works, instead
   * of silently falling through to the next path with no visible error.
   */
  providerConfig: DirectProviderConfig | undefined;
  /** undefined unless all four Cloudflare AI Gateway fields are set. */
  gatewayConfig: GatewayConfig | undefined;
  /** undefined unless a Figma access token is set. */
  figmaConfig: { accessToken: string } | undefined;
}

function defaultState(): ProviderSettingsState {
  return {
    ...DEFAULT_CONFIG,
    setProvider: () => {},
    setApiKey: () => {},
    setModel: () => {},
    setGatewayAccountId: () => {},
    setGatewayGatewayId: () => {},
    setGatewayToken: () => {},
    setGatewayModel: () => {},
    setFigmaAccessToken: () => {},
    providerConfig: undefined,
    gatewayConfig: undefined,
    figmaConfig: undefined,
  };
}

const ProviderSettingsContext = React.createContext<ProviderSettingsState>(defaultState());

/**
 * Holds every credential the docs app's UI can supply in place of a
 * .env.local/.dev.vars value — localStorage-backed like
 * simulationContext.tsx, so it survives the `window.location.reload()`
 * every mutating action in this app already does. None of this ever
 * touches an env var or a git-tracked file: each credential only ever
 * travels browser -> local dev server -> the relevant provider's own HTTPS
 * endpoint (see dev-server/resolve-client.ts).
 */
export function ProviderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = React.useState<StoredConfig>(loadStoredConfig);

  function persist(next: StoredConfig) {
    setConfigState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const value: ProviderSettingsState = {
    ...config,
    setProvider: (provider) => persist({ ...config, provider }),
    setApiKey: (apiKey) => persist({ ...config, apiKey }),
    setModel: (model) => persist({ ...config, model }),
    setGatewayAccountId: (gatewayAccountId) => persist({ ...config, gatewayAccountId }),
    setGatewayGatewayId: (gatewayGatewayId) => persist({ ...config, gatewayGatewayId }),
    setGatewayToken: (gatewayToken) => persist({ ...config, gatewayToken }),
    setGatewayModel: (gatewayModel) => persist({ ...config, gatewayModel }),
    setFigmaAccessToken: (figmaAccessToken) => persist({ ...config, figmaAccessToken }),
    providerConfig: config.apiKey.trim()
      ? {
          provider: config.provider,
          apiKey: config.apiKey.trim(),
          model: config.model.trim() || PROVIDER_INFO[config.provider].modelPlaceholder,
        }
      : undefined,
    gatewayConfig:
      config.gatewayAccountId.trim() && config.gatewayGatewayId.trim() && config.gatewayToken.trim() && config.gatewayModel.trim()
        ? {
            accountId: config.gatewayAccountId.trim(),
            gatewayId: config.gatewayGatewayId.trim(),
            apiToken: config.gatewayToken.trim(),
            model: config.gatewayModel.trim(),
          }
        : undefined,
    figmaConfig: config.figmaAccessToken.trim() ? { accessToken: config.figmaAccessToken.trim() } : undefined,
  };

  return <ProviderSettingsContext.Provider value={value}>{children}</ProviderSettingsContext.Provider>;
}

export function useProviderSettings(): ProviderSettingsState {
  return React.useContext(ProviderSettingsContext);
}
