import * as React from "react";
import type { ComponentType } from "react";
import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core/schema";
import { compileComponent } from "./compileComponent.js";
import { fetchJsonWithRetry } from "./fetchJsonWithRetry.js";

export interface ComponentEntry {
  spec: ComponentSpec;
  /** The real generated component, compiled from generator-react's actual output — never a mock. */
  Component: ComponentType<Record<string, unknown>>;
  /** The component's actual generated CSS, so the preview looks like the real thing rather than unstyled markup. */
  reactCss?: string;
  /** Raw CHANGELOG.md text for this component, if `ds` has generated one yet (Phase 6). */
  changelog?: string;
}

interface ListResponse {
  ok: boolean;
  components?: { spec: unknown; changelog?: string; reactTsx?: string; reactCss?: string }[];
  errors?: string[];
}

export interface RegistryState {
  entries: ComponentEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Every spec with generated React output, sorted by name — fetched fresh
 * from /api/dev/components/list on every mount, not via `import.meta.glob`.
 *
 * The glob approach used to list components/*​/spec.json AND
 * generated/react/*.tsx the same way requestRegistry.ts's old glob listed
 * requests — and hit the identical failure: Vite's dev-time file watcher
 * repeatedly failed to notice a brand-new file (e.g. right after `ds
 * build` writes generated/react/<Name>.tsx), silently serving a stale scan
 * that's missing it, with no error, until the whole dev server was
 * restarted — confirmed live, even with polling enabled.
 *
 * The fix here has two parts, mirroring requestRegistry.ts for the list
 * itself, plus one more step since a component (unlike a request) is real
 * code, not JSON: the spec list comes from the same always-fresh
 * `findSpecFiles`-backed route, which also ships each component's actual
 * generated .tsx source; `compileComponent` (Sucrase, no bundler) turns
 * that into a live component right here in the browser. That works
 * identically whether the route is dev-server/api.ts (`pnpm dev`, reading
 * generated/react/*.tsx off disk) or worker/dev-api.ts (the deployed
 * Worker, reading the same source out of D1) — one rendering path for both.
 */
export function useRegistry(): RegistryState {
  const [entries, setEntries] = React.useState<ComponentEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await fetchJsonWithRetry<ListResponse>("/api/dev/components/list");
      if (!data.components) {
        throw new Error(data.errors?.join("; ") ?? "failed to load components");
      }

      const loaded = data.components.map(({ spec: rawSpec, changelog, reactTsx, reactCss }): ComponentEntry | undefined => {
        const spec = ComponentSpecSchema.parse(rawSpec);
        if (!reactTsx) return undefined;
        try {
          const Component = compileComponent(reactTsx, spec.name);
          if (!Component) return undefined;
          return { spec, Component, changelog, reactCss };
        } catch {
          // Not built yet, or the last build failed — same "leave it out
          // rather than show it broken" posture the old glob version had.
          return undefined;
        }
      });

      return loaded
        .filter((e): e is ComponentEntry => e !== undefined)
        .sort((a, b) => a.spec.name.localeCompare(b.spec.name));
    }

    load()
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "failed to load components");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading, error };
}
