import type { ComponentSpec, TokenTree } from "@ds-platform/core";
import { legalCombos } from "./combos.js";
import { collectTokenVars, type TokenVarInfo } from "./variables.js";
import { buildComponentStatements } from "./component-builder.js";

export interface GeneratedFile {
  /** Relative to generated/figma/ */
  filePath: string;
  contents: string;
}

function generatedHeader(spec: ComponentSpec): string {
  const lines = [
    "GENERATED FILE. Do not edit by hand — your changes will be silently",
    `overwritten. Source: components/${spec.id}/spec.json (version ${spec.version}).`,
    "Regenerate with `ds build " + spec.id + "`.",
    "",
    "Figma plugin code, not application code. Load this file (compiled to",
    "JS) as a plugin's code.js against the sibling manifest.json, inside",
    "Figma's desktop or web app. Plugins run in Figma's own sandbox — there",
    "is no headless runtime, so this cannot be executed or verified outside",
    "Figma itself. Per BUILD-PROMPT: never use the Figma REST API here, it",
    "cannot create components — only the Plugin API can.",
  ];
  return ["/**", ...lines.map((l) => ` * ${l}`), " */"].join("\n");
}

/** Helper function declarations — hoisted, so they can sit outside the async main() below. */
function buildHelpersBlock(): string {
  return [
    "function getOrCreateVariableCollection(name: string): VariableCollection {",
    "  return figma.variables.getLocalVariableCollections().find((c) => c.name === name) ?? figma.variables.createVariableCollection(name);",
    "}",
    "",
    "function getOrCreateVariable(",
    "  collection: VariableCollection,",
    "  name: string,",
    "  type: VariableResolvedDataType,",
    "  value: VariableValue",
    "): Variable {",
    "  const existing = figma.variables",
    "    .getLocalVariables()",
    "    .find((v) => v.name === name && v.variableCollectionId === collection.id);",
    "  const variable = existing ?? figma.variables.createVariable(name, collection, type);",
    "  variable.setValueForMode(collection.modes[0].modeId, value);",
    "  return variable;",
    "}",
    "",
    "function bindColor(variable: Variable): SolidPaint {",
    '  const paint: SolidPaint = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };',
    '  return figma.variables.setBoundVariableForPaint(paint, "color", variable) as SolidPaint;',
    "}",
  ].join("\n");
}

function buildVariablesBlock(vars: TokenVarInfo[]): string {
  const lines: string[] = [
    '  const collection = getOrCreateVariableCollection("Design Tokens");',
    "",
  ];
  for (const v of vars) {
    const valueSource = v.figmaType === "COLOR" ? JSON.stringify(v.initialValue) : String(v.initialValue);
    lines.push(
      `  const ${v.identifier} = getOrCreateVariable(collection, ${JSON.stringify(v.figmaName)}, "${v.figmaType}", ${valueSource});`
    );
  }
  return lines.join("\n");
}

/**
 * Emits a Figma Plugin API script from the spec: one component per legal
 * (prop combo, state) pairing — invalidCombinations pruned the same way
 * core prunes them everywhere else — combined into a single component set,
 * with every styled property bound to a Figma Variable rather than a
 * literal value. Deliberately the Plugin API, never the Figma REST API,
 * which cannot create components at all.
 */
export function generateFigmaPlugin(spec: ComponentSpec, tokens: TokenTree): GeneratedFile[] {
  const vars = collectTokenVars(spec, tokens);
  const varsByRef = new Map(vars.map((v) => [v.ref, v]));
  const combos = legalCombos(spec);

  const lines: string[] = [
    generatedHeader(spec),
    "",
    buildHelpersBlock(),
    "",
    "async function main(): Promise<void> {",
    buildVariablesBlock(vars),
    "",
    // Figma throws "Cannot write to node with unloaded font" if .characters
    // is set before this — a real runtime gotcha no type checker catches.
    '  await figma.loadFontAsync({ family: "Inter", style: "Regular" });',
    "",
    "  const variants: ComponentNode[] = [];",
    "",
    ...combos.map((combo, i) => buildComponentStatements(spec, combo, i, varsByRef)),
    "",
    "  const componentSet = figma.combineAsVariants(variants, figma.currentPage);",
    `  componentSet.name = ${JSON.stringify(spec.name)};`,
    "  figma.currentPage.selection = [componentSet];",
    "  figma.viewport.scrollAndZoomIntoView([componentSet]);",
    `  figma.closePlugin(${JSON.stringify(`Created ${spec.name} component set (${combos.length} variants).`)});`,
    "}",
    "",
    "main();",
  ];

  const manifest = {
    name: `${spec.name} generator`,
    id: `ds-platform-${spec.id}`,
    api: "1.0.0",
    main: "code.js",
    editorType: ["figma"],
  };

  return [
    { filePath: `${spec.name}/code.ts`, contents: lines.join("\n") + "\n" },
    { filePath: `${spec.name}/manifest.json`, contents: JSON.stringify(manifest, null, 2) + "\n" },
  ];
}
