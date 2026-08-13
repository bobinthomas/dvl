import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ComponentSpec } from "@ds-platform/core";
import type { VariantCombo } from "./combos.js";
import { createVariables, buildComponentNode } from "./builder.js";

interface FakeVariable {
  name: string;
  variableCollectionId: string;
  setValueForMode: ReturnType<typeof vi.fn>;
}

function fakeVariable(name: string, collectionId = "coll"): Variable {
  const v: FakeVariable = { name, variableCollectionId: collectionId, setValueForMode: vi.fn() };
  return v as unknown as Variable;
}

function fakeNode() {
  return {
    name: "",
    layoutMode: "",
    primaryAxisAlignItems: "",
    counterAxisAlignItems: "",
    primaryAxisSizingMode: "",
    counterAxisSizingMode: "",
    fills: [] as unknown[],
    strokes: [] as unknown[],
    strokeWeight: 0,
    characters: "",
    setBoundVariable: vi.fn(),
    appendChild: vi.fn(),
  };
}

/**
 * A minimal hand-written stand-in for the real Figma Plugin API global —
 * the runtime-mock equivalent of the deleted generator's string-content
 * assertions, since there's no headless Figma to run this against for real
 * (see README's "Figma integration" section).
 */
function installFakeFigma() {
  const collections: { name: string; id: string; defaultModeId: string }[] = [];
  const variables: Variable[] = [];

  const figma = {
    createComponent: vi.fn(fakeNode),
    createText: vi.fn(fakeNode),
    variables: {
      getLocalVariableCollections: vi.fn(() => collections),
      createVariableCollection: vi.fn((name: string) => {
        const c = { name, id: `coll-${name}`, defaultModeId: "mode-1" };
        collections.push(c);
        return c;
      }),
      getLocalVariables: vi.fn(() => variables),
      createVariable: vi.fn((name: string, collection: { id: string }) => {
        const v = fakeVariable(name, collection.id);
        variables.push(v);
        return v;
      }),
      setBoundVariableForPaint: vi.fn((paint: Record<string, unknown>, field: string, variable: Variable) => ({
        ...paint,
        boundVariables: { [field]: variable },
      })),
    },
  };
  (globalThis as unknown as { figma: typeof figma }).figma = figma;
  return figma;
}

describe("createVariables", () => {
  it("creates one Variable per token ref, all under the same collection", () => {
    const figma = installFakeFigma();
    const byRef = createVariables([
      { ref: "{color.a}", identifier: "var_color_a", figmaName: "color/a", figmaType: "COLOR", initialValue: { r: 0, g: 0, b: 0 } },
      { ref: "{spacing.md}", identifier: "var_spacing_md", figmaName: "spacing/md", figmaType: "FLOAT", initialValue: 8 },
    ]);
    expect(byRef.size).toBe(2);
    expect(figma.variables.createVariableCollection).toHaveBeenCalledTimes(1);
    expect(figma.variables.createVariable).toHaveBeenCalledTimes(2);
  });

  it("reuses an existing variable with the same Figma name instead of creating a duplicate", () => {
    const figma = installFakeFigma();
    const vars = [{ ref: "{color.a}", identifier: "var_color_a", figmaName: "color/a", figmaType: "COLOR" as const, initialValue: { r: 0, g: 0, b: 0 } }];
    createVariables(vars);
    createVariables(vars);
    expect(figma.variables.createVariable).toHaveBeenCalledTimes(1);
  });
});

describe("buildComponentNode", () => {
  const spec = {
    id: "widget",
    name: "Widget",
    anatomy: { root: "div element", parts: [{ name: "label", description: "x", optional: false }] },
    tokens: [
      { part: "root", when: {}, properties: { backgroundColor: "{color.a}" } },
      { part: "label", when: {}, properties: { fontSize: "{fontSize.md}" } },
    ],
  } as unknown as ComponentSpec;
  const combo: VariantCombo = { props: {}, state: "default" };

  beforeEach(() => installFakeFigma());

  it("names the root node using Figma's own variant-property convention — no component name hardcoded", () => {
    const varsByRef = new Map([
      ["{color.a}", fakeVariable("color/a")],
      ["{fontSize.md}", fakeVariable("fontSize/md")],
    ]);
    const node = buildComponentNode(spec, combo, varsByRef) as unknown as ReturnType<typeof fakeNode>;
    expect(node.name).toBe("state=default");
  });

  it("binds the root fill to the resolved token's Variable, never a literal color", () => {
    const colorVar = fakeVariable("color/a");
    const varsByRef = new Map([["{color.a}", colorVar], ["{fontSize.md}", fakeVariable("fontSize/md")]]);
    const node = buildComponentNode(spec, combo, varsByRef) as unknown as ReturnType<typeof fakeNode>;
    expect((node.fills[0] as { boundVariables: { color: Variable } }).boundVariables.color).toBe(colorVar);
  });

  it("creates a label text node bound to its own token and appends it under root when the spec declares a label part", () => {
    const fontVar = fakeVariable("fontSize/md");
    const varsByRef = new Map([["{color.a}", fakeVariable("color/a")], ["{fontSize.md}", fontVar]]);
    const node = buildComponentNode(spec, combo, varsByRef) as unknown as ReturnType<typeof fakeNode>;
    expect(node.appendChild).toHaveBeenCalledTimes(1);
    const label = node.appendChild.mock.calls[0]![0] as ReturnType<typeof fakeNode>;
    expect(label.characters).toBe("Widget");
    expect(label.setBoundVariable).toHaveBeenCalledWith("fontSize", fontVar);
  });

  it("skips label construction when the spec's anatomy has no label part", () => {
    const noLabelSpec = { ...spec, anatomy: { root: "div element", parts: [] } } as unknown as ComponentSpec;
    const varsByRef = new Map([["{color.a}", fakeVariable("color/a")]]);
    const node = buildComponentNode(noLabelSpec, combo, varsByRef) as unknown as ReturnType<typeof fakeNode>;
    expect(node.appendChild).not.toHaveBeenCalled();
  });
});
