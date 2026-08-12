/**
 * Mirror image of packages/generators/figma/src/variables.ts's one-directional
 * token-ref -> Figma-variable conversions. Reuses the exact same naming
 * convention (`.` <-> `/`) that generator already established, so a value
 * read back from Figma can be compared against what the platform would have
 * generated for the same token ref.
 */

/** "color/action/primary/default/bg" -> "{color.action.primary.default.bg}" */
export function figmaNameToTokenRef(figmaName: string): string {
  return `{${figmaName.replace(/\//g, ".")}}`;
}

/** {r,g,b} in Figma's 0-1 range -> "#rrggbb" */
export function unitRgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toByte = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  const toHex = (v: number) => toByte(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** A FLOAT variable's raw number -> the "px" dimension string the spec/CSS side uses. */
export function floatToPxString(n: number): string {
  return `${n}px`;
}
