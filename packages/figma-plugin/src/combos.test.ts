import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core";
import { legalCombos, variantName } from "./combos.js";

const repoRoot = join(__dirname, "..", "..", "..");
const buttonSpec: ComponentSpec = ComponentSpecSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "components", "button", "spec.json"), "utf-8"))
);

describe("legalCombos", () => {
  it("prunes the invalid tertiary+large combination", () => {
    const combos = legalCombos(buttonSpec);
    expect(combos.some((c) => c.props.variant === "tertiary" && c.props.size === "large")).toBe(false);
  });

  it("produces the full cartesian product of enum values x states, minus pruned combinations", () => {
    // 3 variants x 3 sizes x 6 states = 54, minus tertiary+large (6 states) = 48
    expect(legalCombos(buttonSpec).length).toBe(48);
  });
});

describe("variantName", () => {
  it("formats as Figma's own variant-property convention", () => {
    expect(variantName({ props: { variant: "primary", size: "small" }, state: "default" })).toBe(
      "variant=primary, size=small, state=default"
    );
  });
});
