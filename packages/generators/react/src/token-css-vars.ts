import { flattenTokenPaths, resolveToken, type TokenTree } from "@ds-platform/core/tokens";
import { tokenPathToCssVarName } from "./naming.js";

/**
 * Same output as tokens-css.ts's `compileTokensToCss`, but entirely in
 * memory — no Node fs, no Style Dictionary — so it can run in the browser
 * (see apps/docs's live component preview, which has no filesystem to read
 * a compiled generated/react/tokens.css from). Reuses `flattenTokenPaths`
 * and `resolveToken` (the same alias-following resolution every token
 * binding already goes through) rather than re-walking `$value` by hand, so
 * there's one place that understands DTCG aliases, not two.
 */
export function tokenTreeToCssVariables(tree: TokenTree): string {
  const lines = flattenTokenPaths(tree).map((path) => {
    const { value } = resolveToken(`{${path}}`, tree);
    return `  ${tokenPathToCssVarName(path)}: ${value};`;
  });
  return `:root {\n${lines.join("\n")}\n}`;
}
