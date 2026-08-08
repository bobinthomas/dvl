import { kebabCase } from "change-case";

/**
 * Turns a token reference into the exact `var(--...)` expression Style
 * Dictionary's `css` transform group would produce for that token path —
 * same kebabCase algorithm, so generated CSS always matches tokens.css.
 */
export function tokenRefToCssVar(ref: string): string {
  const path = ref.slice(1, -1); // strip { }
  return `var(--${kebabCase(path.split(".").join(" "))})`;
}

/** camelCase CSS-in-spec property name -> real CSS property name. */
export function cssPropertyName(prop: string): string {
  return kebabCase(prop);
}

/** camelCase prop name -> data attribute name, e.g. iconPosition -> icon-position. */
export function dataAttrName(prop: string): string {
  return kebabCase(prop);
}
