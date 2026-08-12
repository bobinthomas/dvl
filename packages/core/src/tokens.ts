/**
 * DTCG token resolution. A spec never contains a raw value, only references
 * like {color.action.primary.default.bg}. This module resolves a reference
 * against the DTCG token tree, following $value aliases, and reports a
 * precise, unresolvable path on failure instead of returning undefined.
 */

export interface TokenNode {
  $value?: string | number;
  $type?: string;
  [child: string]: unknown;
}

export type TokenTree = { [key: string]: TokenTree | TokenNode };

export interface ResolvedToken {
  ref: string;
  path: string;
  value: string | number;
  type: string;
}

export class TokenResolutionError extends Error {
  constructor(
    public readonly ref: string,
    public readonly reason: string
  ) {
    super(`cannot resolve token ${ref}: ${reason}`);
    this.name = "TokenResolutionError";
  }
}

const ALIAS_RE = /^\{([a-zA-Z][a-zA-Z0-9.]*)\}$/;

function parseRef(ref: string): string {
  const m = ALIAS_RE.exec(ref);
  if (!m) {
    throw new TokenResolutionError(ref, "not a valid {a.b.c} token reference");
  }
  return m[1];
}

function getByPath(tree: TokenTree, path: string): TokenTree | TokenNode | undefined {
  const segments = path.split(".");
  let node: unknown = tree;
  for (const segment of segments) {
    if (typeof node !== "object" || node === null || !(segment in node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[segment];
  }
  return node as TokenTree | TokenNode;
}

function isTokenNode(node: unknown): node is TokenNode {
  return typeof node === "object" && node !== null && "$value" in node;
}

/**
 * Resolve a `{a.b.c}` reference against a DTCG token tree, following
 * `$value` aliases (a $value that is itself a `{...}` reference) until a
 * literal is reached. Throws TokenResolutionError on any break in the
 * chain, naming the exact path that failed.
 */
export function resolveToken(
  ref: string,
  tree: TokenTree,
  seen: string[] = []
): ResolvedToken {
  const path = parseRef(ref);

  if (seen.includes(path)) {
    throw new TokenResolutionError(
      ref,
      `alias cycle: ${[...seen, path].join(" -> ")}`
    );
  }

  const node = getByPath(tree, path);
  if (node === undefined) {
    throw new TokenResolutionError(ref, `no token at path "${path}"`);
  }
  if (!isTokenNode(node)) {
    throw new TokenResolutionError(
      ref,
      `"${path}" is a group, not a token (missing $value)`
    );
  }

  const { $value, $type } = node;
  if (typeof $value === "string" && ALIAS_RE.test($value)) {
    const resolved = resolveToken($value, tree, [...seen, path]);
    return { ref, path, value: resolved.value, type: $type ?? resolved.type };
  }

  if ($value === undefined) {
    throw new TokenResolutionError(ref, `token at "${path}" has no $value`);
  }

  return { ref, path, value: $value, type: $type ?? "unknown" };
}

/** True if `ref` resolves against `tree` without throwing. */
export function tokenResolves(ref: string, tree: TokenTree): boolean {
  try {
    resolveToken(ref, tree);
    return true;
  } catch {
    return false;
  }
}

/**
 * Every leaf path this tree can resolve, as bare "a.b.c" strings (no
 * surrounding braces). For handing an AI drafting a spec the real token
 * vocabulary to pick from — this platform's naming (`color.action.*`,
 * `fontSize.sm/md/lg`, no "text"/"background" categories, no "small") isn't
 * guessable from convention alone, so a model with no visibility into the
 * actual tree can only ever invent plausible-sounding paths that don't
 * resolve.
 */
export function flattenTokenPaths(tree: TokenTree, prefix: string[] = []): string[] {
  const paths: string[] = [];
  for (const [key, node] of Object.entries(tree)) {
    const path = [...prefix, key];
    if (isTokenNode(node)) {
      paths.push(path.join("."));
    } else {
      paths.push(...flattenTokenPaths(node as TokenTree, path));
    }
  }
  return paths;
}
