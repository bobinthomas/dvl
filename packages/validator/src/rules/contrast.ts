import { resolveToken, contrastRatio, type ComponentSpec, type TokenTree } from "@ds-platform/core";
import { toPointer, type ValidationIssue } from "../issue.js";

/** Every declared contrast pair must meet its minRatio using real WCAG math on resolved token values. */
export function checkContrastMeetsAA(
  file: string,
  spec: ComponentSpec,
  tokens: TokenTree
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  spec.accessibility.contrast.forEach((pair, i) => {
    let fg, bg;
    try {
      fg = resolveToken(pair.foreground, tokens);
      bg = resolveToken(pair.background, tokens);
    } catch {
      return; // unresolved refs are reported by checkTokenReferencesResolve
    }
    if (fg.type !== "color" || bg.type !== "color") {
      issues.push({
        file,
        pointer: toPointer(["accessibility", "contrast", i]),
        message: `contrast pair for "${pair.part}" must reference $type: color tokens`,
        fix: `point foreground/background at tokens with "$type": "color"`,
      });
      return;
    }
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    if (ratio < pair.minRatio) {
      issues.push({
        file,
        pointer: toPointer(["accessibility", "contrast", i]),
        message: `contrast ${ratio.toFixed(2)}:1 for part "${pair.part}" is below the required ${pair.minRatio}:1`,
        fix: `choose a darker/lighter foreground or background token so contrast reaches ${pair.minRatio}:1`,
      });
    }
  });

  return issues;
}
