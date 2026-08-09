import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ComponentSpecSchema, loadTokens, type ComponentSpec, type TokenTree } from "@ds-platform/core";
import { generateFigmaPlugin } from "./index.js";
import { legalCombos } from "./combos.js";

const repoRoot = join(__dirname, "..", "..", "..", "..");
const buttonSpec: ComponentSpec = ComponentSpecSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "components", "button", "spec.json"), "utf-8"))
);
const tokens: TokenTree = loadTokens(join(repoRoot, "tokens", "tokens.json"));

describe("generateFigmaPlugin", () => {
  it("emits exactly a code.ts and a manifest.json, both under the component name", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    expect(files.map((f) => f.filePath).sort()).toEqual(["Button/code.ts", "Button/manifest.json"]);
  });

  it("creates one component per legal (prop combo, state) pairing, none for the pruned invalid combination", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    const code = files.find((f) => f.filePath.endsWith("code.ts"))!.contents;

    const combos = legalCombos(buttonSpec);
    // tertiary+large is invalid — no state of it should appear, and every legal combo should.
    expect(combos.some((c) => c.props.variant === "tertiary" && c.props.size === "large")).toBe(false);
    expect(code).not.toContain("variant=tertiary, size=large");
    expect((code.match(/figma\.createComponent\(\)/g) ?? []).length).toBe(combos.length);

    for (const combo of combos) {
      const name = [
        ...Object.entries(combo.props).map(([k, v]) => `${k}=${v}`),
        `state=${combo.state}`,
      ].join(", ");
      expect(code).toContain(name);
    }
  });

  it("loads a font before any text node's .characters is set", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    const code = files.find((f) => f.filePath.endsWith("code.ts"))!.contents;

    const loadFontIndex = code.indexOf("loadFontAsync");
    const firstCharactersIndex = code.indexOf(".characters =");
    expect(loadFontIndex).toBeGreaterThan(-1);
    expect(firstCharactersIndex).toBeGreaterThan(-1);
    expect(loadFontIndex).toBeLessThan(firstCharactersIndex);
  });

  it("declares each referenced token exactly once, deduped across every combo and part", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    const code = files.find((f) => f.filePath.endsWith("code.ts"))!.contents;

    const declarations = [...code.matchAll(/const (var_\w+) = getOrCreateVariable/g)].map((m) => m[1]);
    expect(new Set(declarations).size).toBe(declarations.length);
    expect(declarations).toContain("var_color_action_primary_default_bg");
  });

  it("combines every variant into one component set named after the component", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    const code = files.find((f) => f.filePath.endsWith("code.ts"))!.contents;
    expect(code).toContain("figma.combineAsVariants(variants, figma.currentPage)");
    expect(code).toContain('componentSet.name = "Button"');
  });

  it("never touches the Figma REST API — Plugin API only", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    const code = files.find((f) => f.filePath.endsWith("code.ts"))!.contents;
    expect(code).not.toMatch(/fetch\(|api\.figma\.com/);
  });

  it("manifest.json points main at code.js (the compiled output) and declares the figma editor type", () => {
    const files = generateFigmaPlugin(buttonSpec, tokens);
    const manifest = JSON.parse(files.find((f) => f.filePath.endsWith("manifest.json"))!.contents);
    expect(manifest.main).toBe("code.js");
    expect(manifest.editorType).toContain("figma");
  });
});
