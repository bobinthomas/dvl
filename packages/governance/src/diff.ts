import type { ComponentSpec, PropDef, TokenBinding } from "@ds-platform/core";

export type BumpLevel = "major" | "minor" | "patch" | "none";

export interface SpecChange {
  level: Exclude<BumpLevel, "none">;
  description: string;
}

const LEVEL_RANK: Record<BumpLevel, number> = { none: 0, patch: 1, minor: 2, major: 3 };

function propMap(props: PropDef[]): Map<string, PropDef> {
  return new Map(props.map((p) => [p.name, p]));
}

function diffProps(before: PropDef[], after: PropDef[], changes: SpecChange[]): void {
  const beforeMap = propMap(before);
  const afterMap = propMap(after);

  for (const [name] of beforeMap) {
    if (!afterMap.has(name)) changes.push({ level: "major", description: `removed prop "${name}"` });
  }
  for (const [name] of afterMap) {
    if (!beforeMap.has(name)) changes.push({ level: "minor", description: `added prop "${name}"` });
  }

  for (const [name, b] of beforeMap) {
    const a = afterMap.get(name);
    if (!a) continue;

    if (b.type !== a.type) {
      changes.push({ level: "major", description: `prop "${name}" type changed from "${b.type}" to "${a.type}"` });
    }
    if (!b.required && a.required) {
      changes.push({ level: "major", description: `prop "${name}" is now required` });
    }
    if (b.required && !a.required) {
      changes.push({ level: "minor", description: `prop "${name}" is no longer required` });
    }
    if (b.type === "enum" && a.type === "enum") {
      const bValues = new Set(b.values ?? []);
      const aValues = new Set(a.values ?? []);
      for (const v of bValues) {
        if (!aValues.has(v)) changes.push({ level: "major", description: `removed value "${v}" from prop "${name}"` });
      }
      for (const v of aValues) {
        if (!bValues.has(v)) changes.push({ level: "minor", description: `added value "${v}" to prop "${name}"` });
      }
    }
    if (JSON.stringify(b.default) !== JSON.stringify(a.default)) {
      changes.push({ level: "patch", description: `changed default for prop "${name}"` });
    }
    if (b.description !== a.description) {
      changes.push({ level: "patch", description: `updated description for prop "${name}"` });
    }
  }
}

function diffStates(before: ComponentSpec["states"], after: ComponentSpec["states"], changes: SpecChange[]): void {
  const b = new Set(before);
  const a = new Set(after);
  for (const s of b) if (!a.has(s)) changes.push({ level: "major", description: `removed state "${s}"` });
  for (const s of a) if (!b.has(s)) changes.push({ level: "minor", description: `added state "${s}"` });
}

function diffAnatomy(before: ComponentSpec["anatomy"], after: ComponentSpec["anatomy"], changes: SpecChange[]): void {
  const b = new Map(before.parts.map((p) => [p.name, p]));
  const a = new Map(after.parts.map((p) => [p.name, p]));
  for (const [name] of b) if (!a.has(name)) changes.push({ level: "major", description: `removed anatomy part "${name}"` });
  for (const [name] of a) if (!b.has(name)) changes.push({ level: "minor", description: `added anatomy part "${name}"` });
  if (before.root !== after.root) {
    changes.push({ level: "major", description: `anatomy root changed from "${before.root}" to "${after.root}"` });
  }
}

function bindingKey(b: TokenBinding): string {
  return JSON.stringify({ part: b.part, when: b.when });
}

/**
 * A token binding is keyed by (part, when) — the slot it styles — not by
 * its properties. A new slot styled is a capability addition (minor); a
 * slot's properties changing or disappearing is a visual-only change
 * (patch), matching BUILD-PROMPT's "token change is patch" directly: it
 * never adds or removes what a consumer can DO with the component.
 */
function diffTokens(before: TokenBinding[], after: TokenBinding[], changes: SpecChange[]): void {
  const b = new Map(before.map((binding) => [bindingKey(binding), binding]));
  const a = new Map(after.map((binding) => [bindingKey(binding), binding]));

  for (const [key, binding] of b) {
    if (!a.has(key)) {
      changes.push({ level: "patch", description: `removed token binding for "${binding.part}" (${JSON.stringify(binding.when)})` });
    }
  }
  for (const [key, binding] of a) {
    if (!b.has(key)) {
      changes.push({ level: "minor", description: `added token binding for "${binding.part}" (${JSON.stringify(binding.when)})` });
    }
  }
  for (const [key, bBinding] of b) {
    const aBinding = a.get(key);
    if (!aBinding) continue;
    if (JSON.stringify(bBinding.properties) !== JSON.stringify(aBinding.properties)) {
      changes.push({ level: "patch", description: `changed token binding for "${bBinding.part}" (${JSON.stringify(bBinding.when)})` });
    }
  }
}

/**
 * Adding a forbidden combination takes away something a consumer could
 * validly do before — breaking, like removing a prop. Removing one widens
 * what's allowed — additive, like adding a prop.
 */
function diffInvalidCombinations(
  before: ComponentSpec["invalidCombinations"],
  after: ComponentSpec["invalidCombinations"],
  changes: SpecChange[]
): void {
  const b = new Set(before.map((c) => JSON.stringify(c)));
  const a = new Set(after.map((c) => JSON.stringify(c)));
  for (const c of b) if (!a.has(c)) changes.push({ level: "minor", description: `no longer forbids combination ${c}` });
  for (const c of a) if (!b.has(c)) changes.push({ level: "major", description: `now forbids combination ${c}` });
}

/**
 * Anything that loosens the accessibility contract (a requirement, a
 * keyboard binding, an ARIA condition dropped) is breaking — consumers may
 * have relied on the guarantee. Anything that strengthens it is additive.
 */
function diffAccessibility(
  before: ComponentSpec["accessibility"],
  after: ComponentSpec["accessibility"],
  changes: SpecChange[]
): void {
  if (before.role !== after.role) {
    changes.push({ level: "major", description: `accessibility role changed from "${before.role}" to "${after.role}"` });
  }

  const bReq = new Set(before.requirements);
  const aReq = new Set(after.requirements);
  for (const r of bReq) if (!aReq.has(r)) changes.push({ level: "major", description: `dropped accessibility requirement: "${r}"` });
  for (const r of aReq) if (!bReq.has(r)) changes.push({ level: "minor", description: `added accessibility requirement: "${r}"` });

  const bKeys = Object.keys(before.keyboard);
  const aKeys = Object.keys(after.keyboard);
  for (const k of bKeys) if (!(k in after.keyboard)) changes.push({ level: "major", description: `dropped keyboard behavior for "${k}"` });
  for (const k of aKeys) if (!(k in before.keyboard)) changes.push({ level: "minor", description: `added keyboard behavior for "${k}"` });

  const bAria = new Map(before.aria.map((a) => [a.attribute, a.condition]));
  const aAria = new Map(after.aria.map((a) => [a.attribute, a.condition]));
  for (const [attr] of bAria) if (!aAria.has(attr)) changes.push({ level: "major", description: `dropped ARIA condition for "${attr}"` });
  for (const [attr] of aAria) if (!bAria.has(attr)) changes.push({ level: "minor", description: `added ARIA condition for "${attr}"` });

  const bContrast = new Map(before.contrast.map((c) => [`${c.part}:${c.foreground}:${c.background}`, c.minRatio]));
  const aContrast = new Map(after.contrast.map((c) => [`${c.part}:${c.foreground}:${c.background}`, c.minRatio]));
  for (const [key] of bContrast) if (!aContrast.has(key)) changes.push({ level: "major", description: `dropped contrast requirement for ${key}` });
  for (const [key, ratio] of aContrast) {
    if (!bContrast.has(key)) {
      changes.push({ level: "minor", description: `added contrast requirement for ${key} (>=${ratio}:1)` });
    } else if (bContrast.get(key) !== ratio) {
      changes.push({ level: "patch", description: `changed required contrast ratio for ${key} to ${ratio}:1` });
    }
  }
}

/**
 * Compares two versions of the same component spec and returns every
 * change found, each tagged with the bump level it implies on its own.
 * `deriveBump` then takes the highest. Pure — no I/O, no model calls:
 * this is the deterministic half of governance BUILD-PROMPT calls for.
 */
export function diffSpecs(before: ComponentSpec, after: ComponentSpec): SpecChange[] {
  const changes: SpecChange[] = [];

  diffProps(before.props, after.props, changes);
  diffStates(before.states, after.states, changes);
  diffAnatomy(before.anatomy, after.anatomy, changes);
  diffTokens(before.tokens, after.tokens, changes);
  diffInvalidCombinations(before.invalidCombinations, after.invalidCombinations, changes);
  diffAccessibility(before.accessibility, after.accessibility, changes);

  if (before.description !== after.description) {
    changes.push({ level: "patch", description: "updated component description" });
  }
  if (before.category !== after.category) {
    changes.push({ level: "patch", description: `category changed from "${before.category}" to "${after.category}"` });
  }

  return changes;
}

export function deriveBump(changes: SpecChange[]): BumpLevel {
  return changes.reduce<BumpLevel>((level, change) => {
    return LEVEL_RANK[change.level] > LEVEL_RANK[level] ? change.level : level;
  }, "none");
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function bumpVersion(current: string, level: BumpLevel): string {
  const match = SEMVER.exec(current);
  if (!match) throw new Error(`"${current}" is not a valid semver string`);
  const [, majorStr, minorStr, patchStr] = match;
  const major = Number(majorStr);
  const minor = Number(minorStr);
  const patch = Number(patchStr);

  switch (level) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "none":
      return current;
  }
}
