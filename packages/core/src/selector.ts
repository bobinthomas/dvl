/**
 * Selector matching over the flat `tokens` binding list. `when` is a
 * partial match on prop values plus `state`. Resolution order is
 * specificity: a binding with more matched keys wins over one with fewer,
 * and a later binding wins a tie. This is deliberate — it lets one
 * generator handle a two-prop button and a twelve-prop composite component
 * with no special casing. Do not replace it with nested per-variant maps.
 */

import type { TokenBinding } from "./schema.js";

export interface SelectorContext {
  props: Record<string, string>;
  state: string;
}

function contextValue(ctx: SelectorContext, key: string): string | undefined {
  return key === "state" ? ctx.state : ctx.props[key];
}

/** Does every key in `when` match the context? (partial match; empty `when` always matches) */
export function whenMatches(when: Record<string, string>, ctx: SelectorContext): boolean {
  return Object.entries(when).every(([key, value]) => contextValue(ctx, key) === value);
}

/**
 * Resolve the CSS-property -> token-reference map for one anatomy `part`
 * under a given context, applying every matching binding in specificity
 * order (fewest-matched-keys first, later declaration wins ties).
 */
export function matchSelector(
  bindings: TokenBinding[],
  part: string,
  ctx: SelectorContext
): Record<string, string> {
  const matches = bindings
    .map((binding, index) => ({ binding, index }))
    .filter(({ binding }) => binding.part === part && whenMatches(binding.when, ctx))
    .sort((a, b) => {
      const specificityDiff =
        Object.keys(a.binding.when).length - Object.keys(b.binding.when).length;
      if (specificityDiff !== 0) return specificityDiff;
      return a.index - b.index; // later declaration wins ties
    });

  const result: Record<string, string> = {};
  for (const { binding } of matches) {
    Object.assign(result, binding.properties);
  }
  return result;
}
