import { describe, it, expect } from "vitest";
import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core";
import { diffSpecs, deriveBump, bumpVersion } from "./diff.js";

function baseSpec(overrides: Partial<ComponentSpec> = {}): ComponentSpec {
  return ComponentSpecSchema.parse({
    id: "widget",
    name: "Widget",
    category: "actions",
    status: "stable",
    version: "1.0.0",
    owner: "@ds-lead",
    description: "A test widget.",
    anatomy: { root: "div element", parts: [{ name: "label", description: "The label.", optional: false }] },
    props: [
      {
        name: "variant",
        type: "enum",
        values: ["primary", "secondary"],
        default: "primary",
        required: false,
        platforms: ["react", "react-native"],
        description: "Visual style.",
      },
      {
        name: "onPress",
        type: "function",
        required: true,
        platforms: ["react", "react-native"],
        description: "Fires on activation.",
      },
    ],
    states: ["default", "disabled"],
    invalidCombinations: [],
    tokens: [
      { part: "root", when: {}, properties: { borderRadius: "{radius.md}" } },
      { part: "root", when: { variant: "primary" }, properties: { backgroundColor: "{color.action.primary.default.bg}" } },
    ],
    accessibility: {
      role: "button",
      keyboard: { Enter: "activates the widget" },
      aria: [{ attribute: "aria-disabled", condition: "true when disabled" }],
      contrast: [{ part: "root", foreground: "{color.a}", background: "{color.b}", minRatio: 4.5 }],
      requirements: ["Minimum touch target 44x44dp."],
    },
    examples: [{ name: "Default", props: { variant: "primary" }, state: "default" }],
    overrides: { imports: [] },
    ...overrides,
  });
}

describe("diffSpecs — props", () => {
  it("classifies a removed prop as major", () => {
    const before = baseSpec();
    const after = baseSpec({ props: before.props.filter((p) => p.name !== "onPress") });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({ level: "major", description: 'removed prop "onPress"' });
    expect(deriveBump(changes)).toBe("major");
  });

  it("classifies an added prop as minor", () => {
    const before = baseSpec();
    const after = baseSpec({
      props: [
        ...before.props,
        { name: "icon", type: "node", required: false, platforms: ["react", "react-native"], description: "Optional icon." },
      ],
    });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({ level: "minor", description: 'added prop "icon"' });
    expect(deriveBump(changes)).toBe("minor");
  });

  it("classifies a removed enum value as major and an added one as minor", () => {
    const before = baseSpec();
    const after = baseSpec({
      props: before.props.map((p) => (p.name === "variant" ? { ...p, values: ["primary", "tertiary"] } : p)),
    });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({ level: "major", description: 'removed value "secondary" from prop "variant"' });
    expect(changes).toContainEqual({ level: "minor", description: 'added value "tertiary" to prop "variant"' });
    expect(deriveBump(changes)).toBe("major");
  });

  it("classifies a prop description change as patch", () => {
    const before = baseSpec();
    const after = baseSpec({
      props: before.props.map((p) => (p.name === "variant" ? { ...p, description: "Updated copy." } : p)),
    });
    const changes = diffSpecs(before, after);
    expect(changes).toEqual([{ level: "patch", description: 'updated description for prop "variant"' }]);
    expect(deriveBump(changes)).toBe("patch");
  });

  it("classifies a prop becoming required as major", () => {
    const before = baseSpec();
    const after = baseSpec({
      props: before.props.map((p) => (p.name === "variant" ? { ...p, required: true } : p)),
    });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({ level: "major", description: 'prop "variant" is now required' });
  });
});

describe("diffSpecs — states, anatomy, tokens", () => {
  it("classifies a removed state as major and an added one as minor", () => {
    const before = baseSpec();
    const after = baseSpec({ states: ["default", "loading"] });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({ level: "major", description: 'removed state "disabled"' });
    expect(changes).toContainEqual({ level: "minor", description: 'added state "loading"' });
  });

  it("classifies a changed token binding as patch", () => {
    const before = baseSpec();
    const after = baseSpec({
      tokens: before.tokens.map((t) =>
        t.part === "root" && Object.keys(t.when).length === 0
          ? { ...t, properties: { borderRadius: "{radius.lg}" } }
          : t
      ),
    });
    const changes = diffSpecs(before, after);
    expect(changes).toEqual([{ level: "patch", description: 'changed token binding for "root" ({})' }]);
  });

  it("classifies a new token binding as minor", () => {
    const before = baseSpec();
    const after = baseSpec({
      tokens: [...before.tokens, { part: "label", when: {}, properties: { fontSize: "{fontSize.md}" } }],
    });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({ level: "minor", description: 'added token binding for "label" ({})' });
  });
});

describe("diffSpecs — invalidCombinations and accessibility", () => {
  it("classifies a newly forbidden combination as major and a lifted one as minor", () => {
    const before = baseSpec({ invalidCombinations: [{ variant: "secondary", state: "disabled" }] });
    const after = baseSpec({ invalidCombinations: [{ variant: "primary", state: "disabled" }] });
    const changes = diffSpecs(before, after);
    expect(changes.some((c) => c.level === "major" && c.description.includes("primary"))).toBe(true);
    expect(changes.some((c) => c.level === "minor" && c.description.includes("secondary"))).toBe(true);
  });

  it("classifies a dropped accessibility requirement as major", () => {
    const before = baseSpec();
    // status: "draft" here only to satisfy the schema's "stable requires at
    // least one a11y requirement" rule for this fixture — the diff logic
    // itself doesn't look at status.
    const after = baseSpec({ status: "draft", accessibility: { ...before.accessibility, requirements: [] } });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({
      level: "major",
      description: 'dropped accessibility requirement: "Minimum touch target 44x44dp."',
    });
  });

  it("classifies a stricter contrast ratio as patch", () => {
    const before = baseSpec();
    const after = baseSpec({
      accessibility: {
        ...before.accessibility,
        contrast: before.accessibility.contrast.map((c) => ({ ...c, minRatio: 7 })),
      },
    });
    const changes = diffSpecs(before, after);
    expect(changes).toContainEqual({
      level: "patch",
      description: "changed required contrast ratio for root:{color.a}:{color.b} to 7:1",
    });
  });

  it("produces no changes and bump 'none' for two identical specs", () => {
    const spec = baseSpec();
    const changes = diffSpecs(spec, spec);
    expect(changes).toEqual([]);
    expect(deriveBump(changes)).toBe("none");
  });
});

describe("deriveBump", () => {
  it("takes the highest level present", () => {
    expect(
      deriveBump([
        { level: "patch", description: "a" },
        { level: "minor", description: "b" },
      ])
    ).toBe("minor");
    expect(
      deriveBump([
        { level: "major", description: "a" },
        { level: "minor", description: "b" },
        { level: "patch", description: "c" },
      ])
    ).toBe("major");
  });

  it("returns 'none' for an empty change list", () => {
    expect(deriveBump([])).toBe("none");
  });
});

describe("bumpVersion", () => {
  it("bumps major, resetting minor and patch", () => {
    expect(bumpVersion("1.4.7", "major")).toBe("2.0.0");
  });
  it("bumps minor, resetting patch", () => {
    expect(bumpVersion("1.4.7", "minor")).toBe("1.5.0");
  });
  it("bumps patch only", () => {
    expect(bumpVersion("1.4.7", "patch")).toBe("1.4.8");
  });
  it("leaves the version unchanged for 'none'", () => {
    expect(bumpVersion("1.4.7", "none")).toBe("1.4.7");
  });
  it("throws on a non-semver string", () => {
    expect(() => bumpVersion("not-a-version", "patch")).toThrow();
  });
});
