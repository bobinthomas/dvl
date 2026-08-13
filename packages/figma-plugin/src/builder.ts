import type { ComponentSpec } from "@ds-platform/core/schema";
import { matchSelector } from "@ds-platform/core/selector";
import { variantName, type VariantCombo } from "./combos.js";
import type { TokenVarInfo } from "./variables.js";

const CSS_TO_FLOAT_PROPS: Record<string, (VariableBindableNodeField | VariableBindableTextField)[]> = {
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

function getOrCreateVariableCollection(name: string): VariableCollection {
  return (
    figma.variables.getLocalVariableCollections().find((c) => c.name === name) ??
    figma.variables.createVariableCollection(name)
  );
}

function getOrCreateVariable(
  collection: VariableCollection,
  name: string,
  type: VariableResolvedDataType,
  value: VariableValue
): Variable {
  const existing = figma.variables
    .getLocalVariables()
    .find((v) => v.name === name && v.variableCollectionId === collection.id);
  if (existing) return existing;
  const variable = figma.variables.createVariable(name, collection, type);
  variable.setValueForMode(collection.defaultModeId, value);
  return variable;
}

function bindColor(variable: Variable): SolidPaint {
  return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", variable);
}

/**
 * Creates every real Figma Variable a spec's token bindings reference — the
 * runtime equivalent of the deleted generator's emitted
 * `getOrCreateVariable(...)` call sequence, executed directly against the
 * live document instead of stamped into generated source text. Get-or-create
 * throughout: re-running the plugin against the same file reuses existing
 * variables rather than creating duplicates.
 */
export function createVariables(vars: TokenVarInfo[]): Map<string, Variable> {
  const collection = getOrCreateVariableCollection("Design Tokens");
  const byRef = new Map<string, Variable>();
  for (const v of vars) {
    byRef.set(v.ref, getOrCreateVariable(collection, v.figmaName, v.figmaType, v.initialValue));
  }
  return byRef;
}

function bindProperties(node: SceneNode, spec: ComponentSpec, part: string, combo: VariantCombo, varsByRef: Map<string, Variable>): void {
  const bound = matchSelector(spec.tokens, part, { props: combo.props, state: combo.state });
  for (const [cssProp, ref] of Object.entries(bound)) {
    const v = varsByRef.get(ref);
    if (!v) continue;
    for (const floatProp of CSS_TO_FLOAT_PROPS[cssProp] ?? []) {
      node.setBoundVariable(floatProp, v);
    }
    const paintProp = CSS_TO_PAINT_PROP[cssProp];
    if (paintProp === "fills" && "fills" in node) {
      (node as MinimalFillsMixin).fills = [bindColor(v)];
    } else if (paintProp === "strokes" && "strokes" in node) {
      const strokable = node as MinimalStrokesMixin;
      strokable.strokes = [bindColor(v)];
      strokable.strokeWeight = 1;
    }
  }
}

/**
 * Builds one variant's node tree — a root auto-layout frame plus a label
 * text node, matching the deleted generator's shape exactly — directly
 * against the live document, for one legal combo, with every styled
 * property bound to a real Figma Variable, never a literal. No component
 * name or token ref is hardcoded here — everything comes from `spec`.
 */
export function buildComponentNode(spec: ComponentSpec, combo: VariantCombo, varsByRef: Map<string, Variable>): ComponentNode {
  const root = figma.createComponent();
  root.name = variantName(combo);
  root.layoutMode = "HORIZONTAL";
  root.primaryAxisAlignItems = "CENTER";
  root.counterAxisAlignItems = "CENTER";
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "AUTO";

  bindProperties(root, spec, "root", combo, varsByRef);

  if (hasPart(spec, "label")) {
    const label = figma.createText();
    label.characters = spec.name;
    bindProperties(label, spec, "label", combo, varsByRef);
    root.appendChild(label);
  }

  return root;
}

/**
 * Full build: load the font every text node needs before any `.characters`
 * assignment (Figma throws "Cannot write to node with unloaded font"
 * otherwise — a real runtime gotcha, not caught by the type checker), then
 * one component per legal combo, combined into one ComponentSet named
 * after the spec.
 */
export async function buildComponentSet(
  spec: ComponentSpec,
  vars: TokenVarInfo[],
  combos: VariantCombo[]
): Promise<ComponentSetNode> {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const varsByRef = createVariables(vars);
  const variants = combos.map((combo) => buildComponentNode(spec, combo, varsByRef));

  const componentSet = figma.combineAsVariants(variants, figma.currentPage);
  componentSet.name = spec.name;
  figma.currentPage.selection = [componentSet];
  figma.viewport.scrollAndZoomIntoView([componentSet]);
  return componentSet;
}
