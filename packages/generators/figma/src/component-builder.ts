import type { ComponentSpec, TokenTree } from "@ds-platform/core";
import { matchSelector } from "@ds-platform/core/selector";
import type { VariantCombo } from "./combos.js";
import { variantName } from "./combos.js";
import type { TokenVarInfo } from "./variables.js";

const CSS_TO_FLOAT_PROPS: Record<string, string[]> = {
  borderRadius: ["cornerRadius"],
  paddingBlock: ["paddingTop", "paddingBottom"],
  paddingInline: ["paddingLeft", "paddingRight"],
  fontSize: ["fontSize"],
};
const CSS_TO_PAINT_PROP: Record<string, "fills" | "strokes"> = {
  backgroundColor: "fills",
  color: "fills",
  borderColor: "strokes",
};

function hasPart(spec: ComponentSpec, name: string): boolean {
  return spec.anatomy.parts.some((p) => p.name === name);
}

/**
 * Emits the plugin-code statements that create one variant's node tree
 * (a root auto-layout frame plus a label text node) for one legal combo,
 * with every styled property bound to a Figma Variable rather than a
 * literal — the "variables bound" half of the Phase 7 requirement.
 */
export function buildComponentStatements(
  spec: ComponentSpec,
  combo: VariantCombo,
  index: number,
  varsByRef: Map<string, TokenVarInfo>
): string {
  const rootVar = `root${index}`;
  const labelVar = `label${index}`;
  const lines: string[] = [];

  lines.push(`  {`);
  lines.push(`    const ${rootVar} = figma.createComponent();`);
  lines.push(`    ${rootVar}.name = ${JSON.stringify(variantName(combo))};`);
  lines.push(`    ${rootVar}.layoutMode = "HORIZONTAL";`);
  lines.push(`    ${rootVar}.primaryAxisAlignItems = "CENTER";`);
  lines.push(`    ${rootVar}.counterAxisAlignItems = "CENTER";`);
  lines.push(`    ${rootVar}.primaryAxisSizingMode = "AUTO";`);
  lines.push(`    ${rootVar}.counterAxisSizingMode = "AUTO";`);

  const rootBound = matchSelector(spec.tokens, "root", { props: combo.props, state: combo.state });
  for (const [cssProp, ref] of Object.entries(rootBound)) {
    const v = varsByRef.get(ref)!;
    for (const floatProp of CSS_TO_FLOAT_PROPS[cssProp] ?? []) {
      lines.push(`    ${rootVar}.setBoundVariable("${floatProp}", ${v.identifier});`);
    }
    const paintProp = CSS_TO_PAINT_PROP[cssProp];
    if (paintProp === "fills") {
      lines.push(`    ${rootVar}.fills = [bindColor(${v.identifier})];`);
    } else if (paintProp === "strokes") {
      lines.push(`    ${rootVar}.strokes = [bindColor(${v.identifier})];`);
      lines.push(`    ${rootVar}.strokeWeight = 1;`);
    }
  }

  if (hasPart(spec, "label")) {
    lines.push(`    const ${labelVar} = figma.createText();`);
    lines.push(`    ${labelVar}.characters = ${JSON.stringify(spec.name)};`);
    const labelBound = matchSelector(spec.tokens, "label", { props: combo.props, state: combo.state });
    for (const [cssProp, ref] of Object.entries(labelBound)) {
      const v = varsByRef.get(ref)!;
      for (const floatProp of CSS_TO_FLOAT_PROPS[cssProp] ?? []) {
        lines.push(`    ${labelVar}.setBoundVariable("${floatProp}", ${v.identifier});`);
      }
      if (CSS_TO_PAINT_PROP[cssProp] === "fills") {
        lines.push(`    ${labelVar}.fills = [bindColor(${v.identifier})];`);
      }
    }
    lines.push(`    ${rootVar}.appendChild(${labelVar});`);
  }

  lines.push(`    variants.push(${rootVar});`);
  lines.push(`  }`);

  return lines.join("\n");
}
