/**
 * Tiny URL query-param helpers — no router dependency. This is what lets a
 * `window.location.reload()` (the pattern every mutating action in this app
 * uses to pick up its own file writes) land back on the same wizard step /
 * Components selection instead of resetting to the top.
 */
export function getQueryParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

export function setQueryParam(key: string, value: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
}
