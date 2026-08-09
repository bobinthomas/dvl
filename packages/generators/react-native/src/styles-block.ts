import type { ComponentSpec, TokenTree } from "@ds-platform/core";
import { legalCombos, rnStates } from "./combos.js";
import { resolvePartStyle } from "./style-resolve.js";
import { styleKey } from "./naming.js";

function hasPart(spec: ComponentSpec, name: string): boolean {
  return spec.anatomy.parts.some((p) => p.name === name);
}

/**
 * Emits `const styles = StyleSheet.create({ ... })` with one entry per
 * (part, legal enum combo, RN-relevant state) — every value pre-resolved
 * from tokens/tokens.json at generation time, so the generated component
 * has no runtime dependency on the token tree or on @ds-platform/core.
 */
export function buildStylesBlock(spec: ComponentSpec, tokens: TokenTree): string {
  const combos = legalCombos(spec);
  const states: (string | undefined)[] = [undefined, ...rnStates(spec)];
  const parts = ["root", "label", "icon", "loader"].filter((p) => p === "root" || hasPart(spec, p));

  const entries: string[] = [];
  for (const combo of combos) {
    for (const state of states) {
      for (const part of parts) {
        const style = resolvePartStyle(spec, part, { props: combo, state: state ?? "default" }, tokens);
        if (Object.keys(style).length === 0) continue;
        entries.push(`  ${styleKey(part, combo, state)}: ${JSON.stringify(style)},`);
      }
    }
  }

  return ["const styles = StyleSheet.create({", ...entries, "});"].join("\n");
}
