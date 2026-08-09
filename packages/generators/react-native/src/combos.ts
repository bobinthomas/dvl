import type { ComponentSpec, PropDef } from "@ds-platform/core";
import { isCombinationValid } from "@ds-platform/core/invalid-combinations";

/** Enum props that apply to react-native — the axes a RN style variant is keyed on. */
export function variantProps(spec: ComponentSpec): PropDef[] {
  return spec.props.filter((p) => p.type === "enum" && p.platforms.includes("react-native"));
}

/** Every legal cross product of variantProps' values, with invalidCombinations pruned. */
export function legalCombos(spec: ComponentSpec): Record<string, string>[] {
  let combos: Record<string, string>[] = [{}];
  for (const prop of variantProps(spec)) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of prop.values ?? []) {
        next.push({ ...combo, [prop.name]: value });
      }
    }
    combos = next;
  }
  return combos.filter((combo) => isCombinationValid(combo, spec.invalidCombinations));
}

/**
 * Interaction states with a real RN equivalent. "hover" has no meaning on
 * a touch device and "focus" is a platform-drawn affordance on RN (unlike
 * the browser, which needs an explicit outline rule) — so neither gets a
 * generated style variant. "active" maps to Pressable's `pressed` render
 * prop, the nearest RN analogue of a browser :active/:hover state.
 */
const RN_STATES = ["disabled", "loading", "active"] as const;

export function rnStates(spec: ComponentSpec): string[] {
  return RN_STATES.filter((s) => spec.states.includes(s));
}
