/**
 * WCAG 2.x contrast ratio, computed on resolved token values (hex colors).
 * https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

export class ColorParseError extends Error {
  constructor(value: string) {
    super(`cannot parse "${value}" as a color; expected #rgb, #rrggbb or #rrggbbaa`);
    this.name = "ColorParseError";
  }
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 8) {
    h = h.slice(0, 6); // drop alpha for contrast purposes
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new ColorParseError(hex);
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a hex color, per WCAG. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Contrast ratio between two hex colors, in [1, 21]. Order-independent. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsMinimumContrast(hexA: string, hexB: string, minRatio: number): boolean {
  return contrastRatio(hexA, hexB) >= minRatio;
}
