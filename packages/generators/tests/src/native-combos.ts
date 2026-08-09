import type { ComponentSpec } from "@ds-platform/core";
import { isCombinationValid } from "@ds-platform/core/invalid-combinations";

/** Every legal cross product of react-native-applicable enum prop values. */
export function legalCombos(spec: ComponentSpec): Record<string, string>[] {
  const props = spec.props.filter((p) => p.type === "enum" && p.platforms.includes("react-native"));
  let combos: Record<string, string>[] = [{}];
  for (const prop of props) {
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
