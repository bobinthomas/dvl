import { tokenResolves, type ComponentSpec, type TokenTree } from "@ds-platform/core";
import { toPointer, type ValidationIssue } from "../issue.js";

/** Every token reference in the spec must resolve against tokens/tokens.json. */
export function checkTokenReferencesResolve(
  file: string,
  spec: ComponentSpec,
  tokens: TokenTree
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  spec.tokens.forEach((binding, i) => {
    for (const [propName, ref] of Object.entries(binding.properties)) {
      if (!tokenResolves(ref, tokens)) {
        issues.push({
          file,
          pointer: toPointer(["tokens", i, "properties", propName]),
          message: `token reference ${ref} does not resolve against tokens/tokens.json`,
          fix: `add a token at that path in tokens/tokens.json, or point "${propName}" at an existing token`,
        });
      }
    }
  });

  spec.accessibility.contrast.forEach((pair, i) => {
    for (const key of ["foreground", "background"] as const) {
      const ref = pair[key];
      if (!tokenResolves(ref, tokens)) {
        issues.push({
          file,
          pointer: toPointer(["accessibility", "contrast", i, key]),
          message: `token reference ${ref} does not resolve against tokens/tokens.json`,
          fix: `add a token at that path in tokens/tokens.json, or point "${key}" at an existing color token`,
        });
      }
    }
  });

  return issues;
}
