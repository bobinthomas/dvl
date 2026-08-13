import type { ComponentSpec, PropDef } from "@ds-platform/core";
import { buildVariantUnion, defaultLiteral, tsTypeForProp } from "@ds-platform/core/typegen";
import { dataAttrName, humanizePartName } from "./naming.js";

/** Parts with dedicated, hardcoded rendering below — every other declared part is generic. */
const SPECIAL_PARTS = new Set(["icon", "label", "loader"]);

function customParts(spec: ComponentSpec) {
  return spec.anatomy.parts.filter((p) => !SPECIAL_PARTS.has(p.name));
}

/**
 * A part whose every token binding is scoped to a `when` condition (e.g.
 * "only visible in with-timezone") is meant to only appear under those
 * conditions — reusing `tokens[].when` (already "when does this part's
 * styling apply") as the same signal for "when does this part render" is
 * one concept, not two. A part with no bindings, or with at least one
 * unconditional binding, always renders. Returns null for "always visible".
 * Conditions on an undeclared prop can't be expressed in JS (the schema
 * doesn't cross-validate `tokens[].when` keys against `props` the way it
 * does for invalidCombinations) — such a binding is dropped rather than
 * emitting broken code, falling back toward "always visible" like today.
 */
function partVisibilityExpr(spec: ComponentSpec, partName: string): string | null {
  const propNames = new Set(spec.props.map((p) => p.name));
  const bindings = spec.tokens.filter((t) => t.part === partName);
  if (bindings.length === 0) return null;
  if (bindings.some((b) => Object.keys(b.when).length === 0)) return null;

  const clauses: string[] = [];
  for (const binding of bindings) {
    const entries = Object.entries(binding.when);
    const conditions = entries
      .filter(([key]) => key === "state" || propNames.has(key))
      .map(([key, value]) =>
        key === "state" ? `dataState === ${JSON.stringify(value)}` : `${key} === ${JSON.stringify(value)}`
      );
    if (conditions.length !== entries.length) continue;
    if (conditions.length > 0) clauses.push(conditions.length === 1 ? conditions[0] : `(${conditions.join(" && ")})`);
  }
  return clauses.length > 0 ? clauses.join(" || ") : null;
}

const ELEMENT_FOR_ROLE: Record<string, string> = {
  button: "button",
};

function rootTag(spec: ComponentSpec): string {
  return ELEMENT_FOR_ROLE[spec.accessibility.role] ?? "div";
}

function elementInterface(tag: string): string {
  return tag === "div" ? "HTMLDivElement" : `HTML${tag[0].toUpperCase()}${tag.slice(1)}Element`;
}

function findProp(spec: ComponentSpec, name: string, type: PropDef["type"]): PropDef | undefined {
  return spec.props.find((p) => p.name === name && p.type === type);
}

function hasPart(spec: ComponentSpec, name: string): boolean {
  return spec.anatomy.parts.some((p) => p.name === name);
}

export function buildTypesBlock(spec: ComponentSpec): string {
  const { typeSource, constrainedProps } = buildVariantUnion(spec);
  const plainProps = spec.props.filter((p) => !constrainedProps.includes(p.name));

  const lines: string[] = [];

  if (typeSource) {
    const indented = typeSource
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n");
    lines.push(`export type ${spec.name}VariantProps =`, `${indented};`, "");
  } else {
    lines.push(`export type ${spec.name}VariantProps = Record<string, never>;`, "");
  }

  lines.push(`export interface ${spec.name}Props extends ${spec.name}VariantProps {`);
  for (const prop of plainProps) {
    const optional = prop.required ? "" : "?";
    lines.push(`  /** ${prop.description} */`);
    lines.push(`  ${prop.name}${optional}: ${tsTypeForProp(prop)};`);
  }
  if (hasPart(spec, "icon")) {
    lines.push(`  /** Optional leading icon. */`);
    lines.push(`  icon?: React.ReactNode;`);
  }
  if (hasPart(spec, "label")) {
    lines.push(`  /** ${spec.name} content. */`);
    lines.push(`  children?: React.ReactNode;`);
  }
  for (const part of customParts(spec)) {
    lines.push(`  /** ${part.description} */`);
    lines.push(`  ${part.name}?: React.ReactNode;`);
  }
  lines.push(`}`);

  return lines.join("\n");
}

export function buildComponentBlock(spec: ComponentSpec): string {
  const tag = rootTag(spec);
  const elIface = elementInterface(tag);

  const enumProps = spec.props.filter((p) => p.type === "enum");
  const disabledProp = findProp(spec, "disabled", "boolean");
  const loadingProp = findProp(spec, "loading", "boolean");
  const onPressProp = findProp(spec, "onPress", "function");
  const withIcon = hasPart(spec, "icon");
  const withLabel = hasPart(spec, "label");
  const withLoader = hasPart(spec, "loader") && !!loadingProp;
  const otherParts = customParts(spec);

  const destructure: string[] = [];
  for (const prop of spec.props) {
    const def = defaultLiteral(prop);
    destructure.push(def ? `${prop.name} = ${def}` : prop.name);
  }
  if (withIcon) destructure.push("icon");
  if (withLabel) destructure.push("children");
  for (const part of otherParts) destructure.push(part.name);

  const dataAttrLines = enumProps
    .map((p) => `      data-${dataAttrName(p.name)}={${p.name}}`)
    .join("\n");

  let dataStateExpr = "undefined";
  if (loadingProp && disabledProp) {
    dataStateExpr = `${loadingProp.name} ? "loading" : ${disabledProp.name} ? "disabled" : undefined`;
  } else if (loadingProp) {
    dataStateExpr = `${loadingProp.name} ? "loading" : undefined`;
  } else if (disabledProp) {
    dataStateExpr = `${disabledProp.name} ? "disabled" : undefined`;
  }

  const interactionAttrs: string[] = [];
  if (disabledProp) {
    const expr = loadingProp ? `${disabledProp.name} || ${loadingProp.name}` : disabledProp.name;
    interactionAttrs.push(`      disabled={${expr}}`);
    interactionAttrs.push(`      aria-disabled={(${expr}) || undefined}`);
  }
  if (loadingProp) {
    interactionAttrs.push(`      aria-busy={${loadingProp.name} || undefined}`);
  }
  if (onPressProp) {
    interactionAttrs.push(`      onClick={${onPressProp.name}}`);
  }

  const children: string[] = [];
  if (withIcon) {
    children.push(
      `      {icon ? <span className="ds-${spec.id}__icon" data-part="icon" aria-hidden="true">{icon}</span> : null}`
    );
  }
  if (withLoader) {
    children.push(
      `      {${loadingProp!.name} ? <span className="ds-${spec.id}__loader" data-part="loader" aria-hidden="true" /> : null}`
    );
  }
  for (const part of otherParts) {
    const placeholder = JSON.stringify(humanizePartName(part.name));
    const span = `<span className="ds-${spec.id}__${part.name}" data-part="${part.name}">{${part.name} ?? ${placeholder}}</span>`;
    const visibleWhen = partVisibilityExpr(spec, part.name);
    children.push(visibleWhen ? `      {${visibleWhen} ? ${span} : null}` : `      ${span}`);
  }
  if (withLabel) {
    children.push(`      <span className="ds-${spec.id}__label" data-part="label">{children}</span>`);
  }

  const lines = [
    `export const ${spec.name} = React.forwardRef<${elIface}, ${spec.name}Props>(function ${spec.name}(`,
    `  {`,
    ...destructure.map((d) => `    ${d},`),
    `    ...rest`,
    `  },`,
    `  ref`,
    `) {`,
    `  const dataState = ${dataStateExpr};`,
    `  return (`,
    `    <${tag}`,
    `      ref={ref}`,
    `      className="ds-${spec.id}"`,
    `      role="${spec.accessibility.role}"`,
  ];
  if (dataAttrLines) lines.push(dataAttrLines);
  lines.push(`      data-state={dataState}`, ...interactionAttrs, `      {...rest}`, `    >`, ...children, `    </${tag}>`, `  );`, `});`, "", `${spec.name}.displayName = "${spec.name}";`);

  return lines.join("\n");
}
