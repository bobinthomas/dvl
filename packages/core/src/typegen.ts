import type { ComponentSpec, PropDef } from "./schema.js";

export function tsTypeForProp(prop: PropDef): string {
  switch (prop.type) {
    case "enum":
      return prop.values!.map((v) => JSON.stringify(v)).join(" | ");
    case "boolean":
      return "boolean";
    case "string":
      return "string";
    case "number":
      return "number";
    case "function":
      return "() => void";
    case "node":
      return "React.ReactNode";
  }
}

export function defaultLiteral(prop: PropDef): string | undefined {
  if (prop.default === undefined) return undefined;
  return JSON.stringify(prop.default);
}

export interface VariantUnion {
  /** TS source for the union type, or undefined if no props are mutually constrained. */
  typeSource?: string;
  /** Names of props folded into the union (and therefore excluded from the plain prop list). */
  constrainedProps: string[];
}

const domainFor = (prop: PropDef): string[] | undefined => {
  if (prop.type === "enum") return prop.values;
  if (prop.type === "boolean") return ["true", "false"];
  return undefined;
};

/**
 * Builds a discriminated union of legal `{ prop: value }` combinations for
 * every prop implicated in an `invalidCombinations` entry, so the illegal
 * pairings the spec declares are unrepresentable in the generated type —
 * not just rejected at validation time. Props that never appear in an
 * invalidCombinations entry keep their own independent type instead.
 */
export function buildVariantUnion(spec: ComponentSpec): VariantUnion {
  const constrainable = new Map(spec.props.filter((p) => domainFor(p)).map((p) => [p.name, p]));

  const constrainedNames = Array.from(
    new Set(spec.invalidCombinations.flatMap((combo) => Object.keys(combo)))
  ).filter((name) => name !== "state" && constrainable.has(name));

  if (constrainedNames.length === 0) {
    return { constrainedProps: [] };
  }

  const constrainedProps = constrainedNames.map((n) => constrainable.get(n)!);

  let combos: Record<string, string>[] = [{}];
  for (const prop of constrainedProps) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of domainFor(prop)!) {
        next.push({ ...combo, [prop.name]: value });
      }
    }
    combos = next;
  }

  const legalCombos = combos.filter(
    (combo) =>
      !spec.invalidCombinations.some((forbidden) => {
        // A combination conditioned on "state" doesn't make a prop value
        // universally illegal — only illegal alongside that specific state —
        // and this union has no state dimension to condition on. Applying it
        // here would wrongly drop the prop value from the type entirely
        // (e.g. "state: loading, variant: success" forbidden must not erase
        // "success" from every StatusIndicator's variant type).
        if ("state" in forbidden) return false;
        const relevantKeys = Object.keys(forbidden).filter((k) => constrainedNames.includes(k));
        return relevantKeys.length > 0 && relevantKeys.every((k) => combo[k] === forbidden[k]);
      })
  );

  const members = legalCombos.map((combo) => {
    const fields = constrainedProps
      .map((prop) => {
        const raw = combo[prop.name];
        const literal = prop.type === "boolean" ? raw : JSON.stringify(raw);
        return `${prop.name}?: ${literal}`;
      })
      .join("; ");
    return `{ ${fields} }`;
  });

  return { typeSource: members.join("\n| "), constrainedProps: constrainedNames };
}
