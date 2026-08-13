import * as React from "react";
import type { StandingBriefConfig } from "@ds-platform/core/request-schema";

const STORAGE_KEY = "ds-standing-brief-config";

const EMPTY_CONFIG: StandingBriefConfig = {
  guidelines: [],
  referenceExamplesByCategory: {},
  defaultReferenceExample: "",
};

interface StandingBriefState {
  config: StandingBriefConfig;
  setGuidelines: (guidelines: string[]) => void;
  setDefaultReferenceExample: (id: string) => void;
  setCategoryReferenceExample: (category: string, id: string) => void;
}

const StandingBriefContext = React.createContext<StandingBriefState>({
  config: EMPTY_CONFIG,
  setGuidelines: () => {},
  setDefaultReferenceExample: () => {},
  setCategoryReferenceExample: () => {},
});

function loadStoredConfig(): StandingBriefConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CONFIG;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_CONFIG;
    return {
      guidelines: Array.isArray(parsed.guidelines) ? parsed.guidelines.filter((g: unknown) => typeof g === "string") : [],
      referenceExamplesByCategory:
        typeof parsed.referenceExamplesByCategory === "object" && parsed.referenceExamplesByCategory !== null
          ? parsed.referenceExamplesByCategory
          : {},
      defaultReferenceExample:
        typeof parsed.defaultReferenceExample === "string" ? parsed.defaultReferenceExample : "",
    };
  } catch {
    return EMPTY_CONFIG;
  }
}

/**
 * A team-wide baseline for the generated design brief's boilerplate — set
 * once in Settings rather than hand-edited into every brief. Sent as part
 * of every "Generate brief" / "Regenerate brief" request body (see
 * request-schema.ts's buildDesignBrief) — same localStorage-backed,
 * sent-per-request posture as standingQuestionsContext.tsx and
 * providerContext.tsx, nothing server-side to persist. An empty config
 * (the default) means every brief uses buildDesignBrief's own defaults.
 */
export function StandingBriefProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<StandingBriefConfig>(loadStoredConfig);

  function persist(next: StandingBriefConfig) {
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function setGuidelines(guidelines: string[]) {
    persist({ ...config, guidelines });
  }

  function setDefaultReferenceExample(id: string) {
    persist({ ...config, defaultReferenceExample: id });
  }

  function setCategoryReferenceExample(category: string, id: string) {
    const next = { ...(config.referenceExamplesByCategory ?? {}) };
    if (id.trim()) next[category] = id.trim();
    else delete next[category];
    persist({ ...config, referenceExamplesByCategory: next });
  }

  return (
    <StandingBriefContext.Provider value={{ config, setGuidelines, setDefaultReferenceExample, setCategoryReferenceExample }}>
      {children}
    </StandingBriefContext.Provider>
  );
}

export function useStandingBriefConfig(): StandingBriefState {
  return React.useContext(StandingBriefContext);
}
