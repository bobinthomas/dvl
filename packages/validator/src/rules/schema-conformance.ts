import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core";
import type { ZodIssue } from "zod";
import { toPointer, type ValidationIssue } from "../issue.js";

function fixSuggestionFor(issue: ZodIssue): string {
  if (issue.message.includes("token reference")) {
    return "replace the raw value with a token reference, e.g. \"{color.action.primary.default.bg}\"";
  }
  switch (issue.code) {
    case "invalid_type":
      return `expected ${(issue as { expected: string }).expected}, got ${(issue as { received: string }).received}`;
    case "invalid_enum_value":
      return `use one of the allowed values`;
    case "too_small":
      return `provide a non-empty value`;
    default:
      return "adjust the spec to match schemas/component.schema.json";
  }
}

export function checkSchemaConformance(
  file: string,
  raw: unknown
): { issues: ValidationIssue[]; parsed?: ComponentSpec } {
  const result = ComponentSpecSchema.safeParse(raw);
  if (result.success) {
    return { issues: [], parsed: result.data };
  }
  const issues = result.error.issues.map((issue) => ({
    file,
    pointer: toPointer(issue.path),
    message: issue.message,
    fix: fixSuggestionFor(issue),
  }));
  return { issues };
}
