/**
 * invalidCombinations prunes three things from one declaration: the
 * generated TypeScript union (Phase 2), the Figma variant matrix (Phase 7),
 * and this validator rule rejecting any example that uses a forbidden
 * combination. Implemented once here, consumed everywhere.
 */

export type Combination = Record<string, string>;

/** True if `combo` (e.g. an example's props+state) contains a forbidden combination. */
export function violatesInvalidCombination(
  combo: Combination,
  invalidCombinations: Combination[]
): Combination | undefined {
  return invalidCombinations.find((forbidden) =>
    Object.entries(forbidden).every(([key, value]) => combo[key] === value)
  );
}

export function isCombinationValid(
  combo: Combination,
  invalidCombinations: Combination[]
): boolean {
  return violatesInvalidCombination(combo, invalidCombinations) === undefined;
}
