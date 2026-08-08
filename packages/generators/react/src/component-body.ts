import type { ComponentSpec, PropDef } from "@ds-platform/core";
import { buildVariantUnion, defaultLiteral, tsTypeForProp } from "./typegen.js";
import { dataAttrName } from "./naming.js";

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

  const destructure: string[] = [];
  for (const prop of spec.props) {
    const def = defaultLiteral(prop);
    destructure.push(def ? `${prop.name} = ${def}` : prop.name);
  }
  if (withIcon) destructure.push("icon");
  if (withLabel) destructure.push("children");

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
  ];
  if (dataAttrLines) lines.push(dataAttrLines);
  lines.push(`      data-state={dataState}`, ...interactionAttrs, `      {...rest}`, `    >`, ...children, `    </${tag}>`, `  );`, `});`, "", `${spec.name}.displayName = "${spec.name}";`);

  return lines.join("\n");
}
