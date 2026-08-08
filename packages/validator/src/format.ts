import type { ValidationResult } from "./issue.js";

export function formatResult(result: ValidationResult): string {
  if (result.valid) {
    return `PASS  ${result.file}`;
  }
  const lines = [`FAIL  ${result.file}`];
  for (const issue of result.issues) {
    lines.push(`  ${issue.pointer}`);
    lines.push(`    ${issue.message}`);
    lines.push(`    fix: ${issue.fix}`);
  }
  return lines.join("\n");
}
