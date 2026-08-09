import type { ComponentSpec, PropDef } from "@ds-platform/core";
import { buildVariantUnion, defaultLiteral, tsTypeForProp } from "@ds-platform/core/typegen";
import { variantProps, rnStates } from "./combos.js";

function findProp(spec: ComponentSpec, name: string, type: PropDef["type"]): PropDef | undefined {
  return spec.props.find((p) => p.name === name && p.type === type);
}

function hasPart(spec: ComponentSpec, name: string): boolean {
  return spec.anatomy.parts.some((p) => p.name === name);
}

export function buildTypesBlock(spec: ComponentSpec): string {
  const { typeSource, constrainedProps } = buildVariantUnion(spec);
  const plainProps = spec.props.filter(
    (p) => !constrainedProps.includes(p.name) && p.platforms.includes("react-native")
  );

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
  const propNames = variantProps(spec).map((p) => p.name);
  const disabledProp = findProp(spec, "disabled", "boolean");
  const loadingProp = findProp(spec, "loading", "boolean");
  const onPressProp = findProp(spec, "onPress", "function");
  const withIcon = hasPart(spec, "icon");
  const withLabel = hasPart(spec, "label");
  const withLoader = hasPart(spec, "loader") && !!loadingProp;
  const states = rnStates(spec);
  const hasActive = states.includes("active");

  const destructure: string[] = [];
  for (const prop of spec.props.filter((p) => p.platforms.includes("react-native"))) {
    const def = defaultLiteral(prop);
    destructure.push(def ? `${prop.name} = ${def}` : prop.name);
  }
  if (withIcon) destructure.push("icon");
  if (withLabel) destructure.push("children");

  // "state" mirrors the spec's own state vocabulary: loading and disabled
  // are prop-driven exactly like the web output, and "active" stands in
  // for a press — tracked via onPressIn/onPressOut since Pressable has no
  // pseudo-class to key a stylesheet lookup on the way CSS does.
  const stateClauses: string[] = [];
  if (loadingProp && states.includes("loading")) stateClauses.push(`${loadingProp.name} ? "loading"`);
  if (disabledProp && states.includes("disabled")) stateClauses.push(`${disabledProp.name} ? "disabled"`);
  if (hasActive) stateClauses.push(`pressed ? "active"`);
  const stateExpr = stateClauses.length > 0 ? `${stateClauses.join(" : ")} : undefined` : "undefined";

  const accessibilityStateFields: string[] = [];
  if (disabledProp) {
    const expr = loadingProp ? `${disabledProp.name} || ${loadingProp.name}` : disabledProp.name;
    accessibilityStateFields.push(`disabled: ${expr}`);
  }
  if (loadingProp) accessibilityStateFields.push(`busy: ${loadingProp.name}`);

  const disabledExpr = disabledProp
    ? loadingProp
      ? `${disabledProp.name} || ${loadingProp.name}`
      : disabledProp.name
    : loadingProp
      ? loadingProp.name
      : undefined;

  const comboKeyExpr = propNames.length > 0 ? propNames.join(' + "_" + ') : '""';

  const pressableAttrs: string[] = [
    `      accessibilityRole={${JSON.stringify(spec.accessibility.role)}}`,
  ];
  if (accessibilityStateFields.length > 0) {
    pressableAttrs.push(`      accessibilityState={{ ${accessibilityStateFields.join(", ")} }}`);
  }
  if (disabledExpr) pressableAttrs.push(`      disabled={${disabledExpr}}`);
  if (onPressProp) pressableAttrs.push(`      onPress={${onPressProp.name}}`);
  if (hasActive) {
    pressableAttrs.push(
      `      onPressIn={() => setPressed(true)}`,
      `      onPressOut={() => setPressed(false)}`
    );
  }
  pressableAttrs.push(`      style={styles[${JSON.stringify("root_")} + comboKey + stateSuffix]}`);

  const children: string[] = [];
  if (withIcon) {
    children.push(
      `      {icon ? <View style={styles[${JSON.stringify("icon_")} + comboKey + stateSuffix]}>{icon}</View> : null}`
    );
  }
  if (withLoader) {
    children.push(
      `      {${loadingProp!.name} ? <ActivityIndicator style={styles[${JSON.stringify("loader_")} + comboKey + stateSuffix]} /> : null}`
    );
  }
  if (withLabel) {
    children.push(
      `      <Text style={styles[${JSON.stringify("label_")} + comboKey + stateSuffix]}>{children}</Text>`
    );
  }

  const lines = [
    `export function ${spec.name}({`,
    ...destructure.map((d) => `  ${d},`),
    `  ...rest`,
    `}: ${spec.name}Props) {`,
  ];
  if (hasActive) lines.push(`  const [pressed, setPressed] = React.useState(false);`);
  lines.push(
    `  const state = ${stateExpr};`,
    `  const comboKey = ${comboKeyExpr};`,
    `  const stateSuffix = state ? "_" + state : "";`,
    `  return (`,
    `    <Pressable`,
    ...pressableAttrs,
    `      {...rest}`,
    `    >`,
    ...children,
    `    </Pressable>`,
    `  );`,
    `}`
  );

  return lines.join("\n");
}
