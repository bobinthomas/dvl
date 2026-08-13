import * as React from "react";
import { ComponentRequestSchema, type ComponentRequest } from "@ds-platform/core/request-schema";
import { fetchJsonWithRetry } from "./fetchJsonWithRetry.js";

export interface RequestEntry {
  request: ComponentRequest;
  /** Raw BRIEF.md text for this request, if `ds request brief` has run yet. */
  brief?: string;
}

interface ListResponse {
  ok: boolean;
  requests?: { request: unknown; brief?: string }[];
  errors?: string[];
}

export interface RequestRegistryState {
  entries: RequestEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Every filed component request, sorted oldest first — fetched fresh from
 * /api/dev/requests/list on every mount, not via `import.meta.glob`.
 *
 * The glob approach (still used by registry.ts, for built component code
 * that genuinely has to go through Vite's module transform) depends on
 * Vite's dev-time file watcher noticing new requests/<id>/request.json
 * files. That watcher can silently go stale on Windows — e.g. "Clear all
 * generated" deletes the requests/ directory, a later refiled request
 * recreates it, and the watcher never picks the new directory back up —
 * leaving this list empty until the whole dev server is restarted, with no
 * error to explain why. A plain server-side fs read on every request can't
 * go stale that way. Every mutating action in this app already does a full
 * `window.location.reload()` on success, which remounts this hook and
 * refetches, so no separate cache-invalidation is needed.
 */
export function useRequestRegistry(): RequestRegistryState {
  const [entries, setEntries] = React.useState<RequestEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchJsonWithRetry<ListResponse>("/api/dev/requests/list")
      .then((data) => {
        if (cancelled) return;
        if (!data.requests) {
          setError(data.errors?.join("; ") ?? "failed to load requests");
          setLoading(false);
          return;
        }
        const parsed = data.requests
          .map((r): RequestEntry => ({ request: ComponentRequestSchema.parse(r.request), brief: r.brief }))
          .sort((a, b) => a.request.requestedAt.localeCompare(b.request.requestedAt));
        setEntries(parsed);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Loading requests only works while running `pnpm dev` locally.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading, error };
}
