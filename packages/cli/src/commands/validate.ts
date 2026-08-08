import { join } from "node:path";
import { findSpecFiles, specPathForId } from "@ds-platform/core";
import { validateSpecFile, formatResult } from "@ds-platform/validator";

export interface ValidateOptions {
  cwd: string;
}

/** Validates one spec (by component id) or every spec under components/. Returns true iff all valid. */
export function runValidate(id: string | undefined, options: ValidateOptions): boolean {
  const componentsDir = join(options.cwd, "components");
  const tokensPath = join(options.cwd, "tokens", "tokens.json");

  const specPaths = id ? [specPathForId(componentsDir, id)] : findSpecFiles(componentsDir);

  if (specPaths.length === 0) {
    console.error(
      id
        ? `no spec found for "${id}" at ${specPathForId(componentsDir, id)}`
        : `no specs found under ${componentsDir}`
    );
    return false;
  }

  let allValid = true;
  for (const specPath of specPaths) {
    const result = validateSpecFile(specPath, tokensPath);
    console.log(formatResult(result));
    if (!result.valid) allValid = false;
  }
  return allValid;
}
