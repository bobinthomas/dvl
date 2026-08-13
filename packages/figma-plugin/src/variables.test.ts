import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ComponentSpecSchema, loadTokens, type ComponentSpec, type TokenTree } from "@ds-platform/core";
import { collectTokenVars } from "./variables.js";

const repoRoot = join(__dirname, "..", "..", "..");
const buttonSpec: ComponentSpec = ComponentSpecSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "components", "button", "spec.json"), "utf-8"))
);
const tokens: TokenTree = loadTokens(join(repoRoot, "tokens", "tokens.json"));

describe("collectTokenVars", () => {
  it("declares each referenced token exactly once, deduped across every combo and part", () => {
    const vars = collectTokenVars(buttonSpec, tokens);
    const refs = vars.map((v) => v.ref);
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs).toContain("{color.action.primary.default.bg}");
  });

  it("resolves colors to unit-RGB and floats to plain numbers, never a raw hex/px string", () => {
    const vars = collectTokenVars(buttonSpec, tokens);
    const colorVar = vars.find((v) => v.figmaType === "COLOR");
    const floatVar = vars.find((v) => v.figmaType === "FLOAT");
    expect(colorVar?.initialValue).toHaveProperty("r");
    expect(typeof floatVar?.initialValue).toBe("number");
  });
});
