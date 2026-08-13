/**
 * D1's Workers binding intermittently returns a generic "D1_ERROR: internal
 * error" for a query that succeeds an instant later — confirmed live: the
 * exact same query against D1's own query API never failed, and retrying
 * the Worker route a few seconds later always recovered. A couple of quick
 * retries beats surfacing a real, present component/request as "gone" for
 * what's actually a transient edge blip.
 */
export async function fetchJsonWithRetry<T extends { ok: boolean; errors?: string[] }>(
  url: string,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, { method: "POST" });
      const data = (await res.json().catch(() => null)) as T | null;
      if (data?.ok) return data;
      lastError = new Error(data?.errors?.join("; ") ?? `request to ${url} failed`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
