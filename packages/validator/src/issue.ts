/** A validation failure: exactly where it is, and what to do about it. */
export interface ValidationIssue {
  file: string;
  pointer: string;
  message: string;
  fix: string;
}

export interface ValidationResult {
  file: string;
  valid: boolean;
  issues: ValidationIssue[];
}

/** JSON Pointer (RFC 6901) from a Zod-style path array. */
export function toPointer(path: (string | number)[]): string {
  if (path.length === 0) return "/";
  return (
    "/" +
    path
      .map((seg) => String(seg).replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  );
}
