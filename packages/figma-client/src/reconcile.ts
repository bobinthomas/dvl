import type { ComponentRequest } from "@ds-platform/core";
import type { FigmaFileNode, FigmaNode } from "./client.js";

export interface ReconciliationReport {
  ok: boolean;
  matched: string[];
  missing: string[];
  issues: string[];
}

function walk(node: FigmaNode, visit: (n: FigmaNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

/**
 * Case- and separator-insensitive: a request's PascalCase `name` (e.g.
 * "TimeSlotPicker") is expected to match however a designer naturally
 * named the Figma layer — "Time Slot Picker", "time-slot-picker",
 * "TIME_SLOT_PICKER" — not just an exact PascalCase string.
 */
function normalizeComponentName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findComponentNode(root: FigmaNode, name: string): FigmaNode | undefined {
  let found: FigmaNode | undefined;
  const target = normalizeComponentName(name);
  walk(root, (n) => {
    if (found) return;
    if ((n.type === "COMPONENT_SET" || n.type === "COMPONENT") && normalizeComponentName(n.name) === target) {
      found = n;
    }
  });
  return found;
}

function hasAnyBoundVariable(node: FigmaNode): boolean {
  let found = false;
  walk(node, (n) => {
    if (found) return;
    if (n.boundVariables && Object.keys(n.boundVariables).length > 0) found = true;
  });
  return found;
}

/**
 * Deliberately light for MVP: a request has no `props`/`invalidCombinations`
 * yet (that's the eventual spec's job — see typegen.ts / combos.ts for the
 * full variant-matrix machinery, which only applies post-promotion). This
 * checks that a designer built *something* matching the request, using
 * Design Token variables rather than raw values — the same discipline the
 * validator's checkRawValues rule enforces on the spec side.
 */
export function reconcileRequest(request: ComponentRequest, file: FigmaFileNode): ReconciliationReport {
  const node = findComponentNode(file.document, request.name);
  if (!node) {
    return {
      ok: false,
      matched: [],
      missing: [...request.expectedVariants],
      issues: [`no component or component-set named "${request.name}" found in the Figma file`],
    };
  }

  // Normalized the same way as the component name: Figma's own variant
  // naming convention is "Property=Value" with spaces (e.g. "State=With
  // Timezone"), not the request's hyphenated "with-timezone" — normalizing
  // both sides makes the substring check match either style.
  const childNames = (node.children ?? []).map((c) => normalizeComponentName(c.name));
  const matched = request.expectedVariants.filter((v) =>
    childNames.some((childName) => childName.includes(normalizeComponentName(v)))
  );
  const missing = request.expectedVariants.filter((v) => !matched.includes(v));

  const issues: string[] = [];
  for (const m of missing) issues.push(`no variant matching "${m}" found under "${request.name}"`);
  if (!hasAnyBoundVariable(node)) {
    issues.push(
      `no Design Token variables are bound under "${request.name}" — fills/text styles should reference the shared variable library, not raw values`
    );
  }

  return { ok: missing.length === 0 && hasAnyBoundVariable(node), matched, missing, issues };
}
