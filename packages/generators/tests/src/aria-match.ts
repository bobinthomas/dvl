import type { PropDef } from "@ds-platform/core";

/**
 * An aria `condition` is free-text ("true when disabled or loading is
 * true"), and generating tests from arbitrary English is exactly the kind
 * of model-shaped work BUILD-PROMPT forbids at generation time. Instead
 * this does plain substring matching: which of the spec's own boolean prop
 * names appear as whole words in the condition. That's mechanical, and for
 * every condition actually written in this platform's specs so far it
 * recovers the intended prop set exactly ("disabled or loading" matches
 * both; "loading is true" matches only loading).
 */
export function matchedBooleanProps(condition: string, props: PropDef[]): PropDef[] {
  return props.filter(
    (p) => p.type === "boolean" && new RegExp(`\\b${p.name}\\b`, "i").test(condition)
  );
}
