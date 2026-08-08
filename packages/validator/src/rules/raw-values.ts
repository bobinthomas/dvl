import { toPointer, type ValidationIssue } from "../issue.js";

const TOKEN_REF_RE = /^\{[a-zA-Z][a-zA-Z0-9.]*\}$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const DIMENSION_RE = /^-?\d+(\.\d+)?(px|rem|em|%)$/;
const BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;

function isSuspiciousRawValue(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  if (TOKEN_REF_RE.test(value)) return false;
  return HEX_RE.test(value) || DIMENSION_RE.test(value) || BARE_NUMBER_RE.test(value);
}

function flagRawValue(
  file: string,
  pointer: (string | number)[],
  fieldLabel: string,
  value: unknown
): ValidationIssue {
  return {
    file,
    pointer: toPointer(pointer),
    message: `"${fieldLabel}" has a raw value (${JSON.stringify(value)}) — specs may only reference tokens, never literal hex/px/rem/numeric values`,
    fix: `replace ${JSON.stringify(value)} with a token reference, e.g. "{color.action.primary.default.bg}", pointing at a matching entry in tokens/tokens.json`,
  };
}

/**
 * Scans the raw (unvalidated) spec JSON for literal values in the two
 * places a spec is allowed to hold styling data: token bindings and
 * declared contrast pairs. Runs independently of Zod parsing so a single
 * raw value produces a precise, friendly error even though it also makes
 * the overall schema parse fail.
 */
export function checkRawValues(file: string, raw: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const root = raw as Record<string, unknown>;

  const tokens = Array.isArray(root?.tokens) ? root.tokens : [];
  tokens.forEach((binding, i) => {
    const properties = (binding as Record<string, unknown>)?.properties;
    if (properties && typeof properties === "object") {
      for (const [propName, value] of Object.entries(properties as Record<string, unknown>)) {
        if (isSuspiciousRawValue(value)) {
          issues.push(flagRawValue(file, ["tokens", i, "properties", propName], propName, value));
        }
      }
    }
  });

  const accessibility = root?.accessibility as Record<string, unknown> | undefined;
  const contrast = Array.isArray(accessibility?.contrast) ? accessibility!.contrast : [];
  (contrast as Record<string, unknown>[]).forEach((pair, i) => {
    for (const key of ["foreground", "background"] as const) {
      const value = pair?.[key];
      if (isSuspiciousRawValue(value)) {
        issues.push(flagRawValue(file, ["accessibility", "contrast", i, key], key, value));
      }
    }
  });

  return issues;
}
