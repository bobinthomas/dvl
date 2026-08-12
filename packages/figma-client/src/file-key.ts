const FIGMA_URL_KEY = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/;

/**
 * Accepts either a raw Figma file key or a full Figma file/design URL —
 * the natural thing to paste from the browser address bar, e.g.
 * "https://www.figma.com/design/ANKNyWv3v2bP6eWjpFH3gO/DV-MVP?node-id=19-4"
 * — and returns just the key the REST API's /files/{key} endpoint expects.
 * A bare key (no figma.com in it) passes through unchanged, just trimmed.
 */
export function extractFigmaFileKey(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(FIGMA_URL_KEY);
  return match ? match[1]! : trimmed;
}
