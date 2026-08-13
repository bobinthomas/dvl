import type { ComponentSpec, PropDef } from "@ds-platform/core/schema";
import { isCombinationValid } from "@ds-platform/core/invalid-combinations";

export interface VariantCombo {
  props: Record<string, string>;
  state: string;
}

function enumProps(spec: ComponentSpec): PropDef[] {
  return spec.props.filter((p) => p.type === "enum");
}

/**
 * Every legal (prop combo, state) pairing — the full variant matrix Figma
 * needs: Figma is a static design surface, so every declared state
 * (including hover/focus, which have no runtime equivalent on native) gets
 * its own variant for a designer to reference. invalidCombinations can name
 * "state" alongside prop names (the schema allows it), so pruning checks
 * the combo with state included.
 */
export function legalCombos(spec: ComponentSpec): VariantCombo[] {
  let propCombos: Record<string, string>[] = [{}];
  for (const prop of enumProps(spec)) {
    const next: Record<string, string>[] = [];
    for (const combo of propCombos) {
      for (const value of prop.values ?? []) {
        next.push({ ...combo, [prop.name]: value });
      }
    }
    propCombos = next;
  }

  const combos: VariantCombo[] = [];
  for (const props of propCombos) {
    for (const state of spec.states) {
      const flat = { ...props, state };
      if (isCombinationValid(flat, spec.invalidCombinations)) {
        combos.push({ props, state });
      }
    }
  }
  return combos;
}

/** Figma's own variant-property naming convention: "Prop1=Value1, Prop2=Value2". */
export function variantName(combo: VariantCombo): string {
  const parts = [...Object.entries(combo.props).map(([k, v]) => `${k}=${v}`), `state=${combo.state}`];
  return parts.join(", ");
}
