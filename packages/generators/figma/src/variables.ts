import type { ComponentSpec, TokenTree } from "@ds-platform/core";
import { matchSelector } from "@ds-platform/core/selector";
import { resolveToken } from "@ds-platform/core/tokens";
import { legalCombos } from "./combos.js";

export interface TokenVarInfo {
  /** e.g. "{color.action.primary.default.bg}" */
  ref: string;
  /** JS-safe local const name, e.g. "var_color_action_primary_default_bg" */
  identifier: string;
  /** Figma Variable name, matching Figma's own "/" grouping convention. */
  figmaName: string;
  figmaType: "COLOR" | "FLOAT";
  /** The variable's default value, resolved from tokens/tokens.json at generation time. */
  initialValue: { r: number; g: number; b: number } | number;
}

function toIdentifier(ref: string): string {
  return "var_" + ref.slice(1, -1).replace(/\./g, "_");
}

function toFigmaVariableName(ref: string): string {
  return ref.slice(1, -1).replace(/\./g, "/");
}

function hexToUnitRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h.slice(0, 6), 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}

function toFloatValue(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const match = /^(-?\d*\.?\d+)px$/.exec(raw);
  return match ? Number(match[1]) : Number(raw) || 0;
}

/**
 * Every token reference the spec's part/combo matrix actually uses, deduped
 * by ref, each destined to become one bound Figma Variable — not a literal
 * value baked into the node, so changing the variable in Figma updates
 * every variant that references it, the same "one governed source" idea
 * the rest of the platform is built on.
 */
export function collectTokenVars(spec: ComponentSpec, tokens: TokenTree): TokenVarInfo[] {
  const parts = ["root", "label", "icon", "loader"].filter(
    (p) => p === "root" || spec.anatomy.parts.some((ap) => ap.name === p)
  );
  const refs = new Set<string>();

  for (const combo of legalCombos(spec)) {
    for (const part of parts) {
      const bound = matchSelector(spec.tokens, part, { props: combo.props, state: combo.state });
      for (const ref of Object.values(bound)) refs.add(ref);
    }
  }
  for (const pair of spec.accessibility.contrast) {
    refs.add(pair.foreground);
    refs.add(pair.background);
  }

  return Array.from(refs)
    .sort()
    .map((ref) => {
      const resolved = resolveToken(ref, tokens);
      const figmaType: TokenVarInfo["figmaType"] = resolved.type === "color" ? "COLOR" : "FLOAT";
      return {
        ref,
        identifier: toIdentifier(ref),
        figmaName: toFigmaVariableName(ref),
        figmaType,
        initialValue: figmaType === "COLOR" ? hexToUnitRgb(String(resolved.value)) : toFloatValue(resolved.value),
      };
    });
}
