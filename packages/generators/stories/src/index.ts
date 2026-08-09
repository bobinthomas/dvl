import type { ComponentSpec } from "@ds-platform/core";

export interface GeneratedFile {
  /** Relative to generated/stories/ */
  filePath: string;
  contents: string;
}

const CATEGORY_LABEL: Record<ComponentSpec["category"], string> = {
  actions: "Actions",
  forms: "Forms",
  feedback: "Feedback",
  layout: "Layout",
  navigation: "Navigation",
  "data-display": "Data display",
};

/** "Primary / Medium" -> "PrimaryMedium", a valid CSF named-export identifier. */
function toExportName(name: string): string {
  const words = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const pascal = words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal;
}

function generatedHeader(spec: ComponentSpec): string {
  const lines = [
    "GENERATED FILE. Do not edit by hand — your changes will be silently",
    `overwritten. Source: components/${spec.id}/spec.json (version ${spec.version}).`,
    "Regenerate with `ds build " + spec.id + "`.",
  ];
  return ["/**", ...lines.map((l) => ` * ${l}`), " */"].join("\n");
}

/**
 * One CSF3 story per example declared in the spec — not hand-curated,
 * derived. A designer adding an example to the spec gets a new Storybook
 * story on the next `ds build` with no Storybook-side authoring at all.
 */
export function generateStories(spec: ComponentSpec): GeneratedFile[] {
  const functionProps = spec.props.filter((p) => p.type === "function");
  const hasLabel = spec.anatomy.parts.some((p) => p.name === "label");

  const lines: string[] = [
    generatedHeader(spec),
    `import type { Meta, StoryObj } from "@storybook/react";`,
    `import { ${spec.name} } from "../react/${spec.name}.js";`,
    `import "../react/${spec.id}.css";`,
    `import "../react/tokens.css";`,
    "",
    `const meta: Meta<typeof ${spec.name}> = {`,
    `  title: "${CATEGORY_LABEL[spec.category]}/${spec.name}",`,
    `  component: ${spec.name},`,
    `  parameters: { layout: "centered" },`,
    `};`,
    "",
    "export default meta;",
    `type Story = StoryObj<typeof ${spec.name}>;`,
    "",
  ];

  const seenNames = new Set<string>();
  for (const example of spec.examples) {
    let exportName = toExportName(example.name);
    while (seenNames.has(exportName)) exportName += "_";
    seenNames.add(exportName);

    const args: Record<string, unknown> = { ...example.props };
    for (const fp of functionProps) {
      if (!(fp.name in args)) args[fp.name] = () => {};
    }
    if (hasLabel && !("children" in args)) args.children = spec.name;

    const argsSource = Object.entries(args)
      .map(([key, value]) => `    ${key}: ${typeof value === "function" ? "() => {}" : JSON.stringify(value)},`)
      .join("\n");

    lines.push(
      `export const ${exportName}: Story = {`,
      `  name: ${JSON.stringify(example.name)},`,
      `  args: {`,
      argsSource,
      `  },`,
      `};`,
      ""
    );
  }

  return [{ filePath: `${spec.name}.stories.tsx`, contents: lines.join("\n") }];
}
