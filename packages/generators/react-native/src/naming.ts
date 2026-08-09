/**
 * Plain underscore-joined style keys, e.g. ("root", {variant:"primary",
 * size:"medium"}, "active") -> "root_primary_medium_active". Deliberately
 * not run through change-case: the generated component rebuilds this same
 * key at runtime from prop values with a template literal, and that file
 * must stay dependency-free (only "react") — so the naming scheme has to
 * be reproducible with nothing fancier than string concatenation.
 */
export function styleKey(part: string, combo: Record<string, string>, state?: string): string {
  const segments = [part, ...Object.values(combo), state].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  return segments.join("_");
}
