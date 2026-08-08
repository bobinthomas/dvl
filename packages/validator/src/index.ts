import { readFileSync } from "node:fs";
import { loadTokens } from "@ds-platform/core";
import type { ValidationIssue, ValidationResult } from "./issue.js";
import { checkSchemaConformance } from "./rules/schema-conformance.js";
import { checkRawValues } from "./rules/raw-values.js";
import { checkTokenReferencesResolve } from "./rules/token-refs.js";
import { checkExamplesAreLegal } from "./rules/examples.js";
import { checkContrastMeetsAA } from "./rules/contrast.js";

export * from "./issue.js";
export { formatResult } from "./format.js";

/**
 * Runs every validation rule against one spec file. This is the gate: if
 * any rule fails, nothing downstream generates. Every issue names the
 * file, a JSON pointer into the spec, and what to do about it.
 */
export function validateSpecFile(specPath: string, tokensPath: string): ValidationResult {
  const raw: unknown = JSON.parse(readFileSync(specPath, "utf-8"));
  const tokens = loadTokens(tokensPath);

  const rawValueIssues = checkRawValues(specPath, raw);
  const rawValuePointers = new Set(rawValueIssues.map((i) => i.pointer));

  const { issues: schemaIssues, parsed } = checkSchemaConformance(specPath, raw);
  const dedupedSchemaIssues = schemaIssues.filter((i) => !rawValuePointers.has(i.pointer));

  const issues: ValidationIssue[] = [...rawValueIssues, ...dedupedSchemaIssues];

  if (parsed) {
    issues.push(...checkTokenReferencesResolve(specPath, parsed, tokens));
    issues.push(...checkExamplesAreLegal(specPath, parsed));
    issues.push(...checkContrastMeetsAA(specPath, parsed, tokens));
  }

  return { file: specPath, valid: issues.length === 0, issues };
}
