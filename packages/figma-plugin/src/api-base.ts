/**
 * The Worker's base URL to call for /api/figma/jobs. A locally-installed
 * dev plugin has no build-time environment mechanism (it's one static
 * bundle, not built per-environment the way apps/docs is via Vite/
 * Wrangler), so this is resolved at runtime from a human-editable field in
 * ui.html (persisted via figma.clientStorage), falling back to the
 * deployed Worker. Both the production URL and whatever localhost port is
 * used for local testing must also be listed in manifest.json's
 * networkAccess.allowedDomains, or Figma blocks the request before it
 * reaches here.
 */
export const DEFAULT_API_BASE = "https://ds-platform-docs.bobinthomas.workers.dev";

export function resolveApiBase(override?: string | null): string {
  const trimmed = override?.trim();
  return (trimmed || DEFAULT_API_BASE).replace(/\/+$/, "");
}
