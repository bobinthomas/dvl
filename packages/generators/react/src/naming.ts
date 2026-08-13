import { capitalCase, kebabCase } from "change-case";

/** A dotted token path (no braces) -> the exact `--...` custom property name Style Dictionary's `css` transform group would produce for it. */
export function tokenPathToCssVarName(path: string): string {
  return `--${kebabCase(path.split(".").join(" "))}`;
}

/**
 * Turns a token reference into the exact `var(--...)` expression Style
 * Dictionary's `css` transform group would produce for that token path —
 * same kebabCase algorithm, so generated CSS always matches tokens.css.
 */
export function tokenRefToCssVar(ref: string): string {
  const path = ref.slice(1, -1); // strip { }
  return `var(${tokenPathToCssVarName(path)})`;
}

/** camelCase CSS-in-spec property name -> real CSS property name. */
export function cssPropertyName(prop: string): string {
  return kebabCase(prop);
}

/** camelCase prop name -> data attribute name, e.g. iconPosition -> icon-position. */
export function dataAttrName(prop: string): string {
  return kebabCase(prop);
}

/** camelCase anatomy part name -> readable placeholder text, e.g. timeSlotList -> "Time Slot List". */
export function humanizePartName(part: string): string {
  return capitalCase(part);
}
