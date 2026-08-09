import type { ComponentSpec, PropDef } from "@ds-platform/core";
import { matchedBooleanProps } from "./aria-match.js";
import { legalCombos } from "./native-combos.js";

export interface GeneratedFile {
  /** Relative to generated/tests/ */
  filePath: string;
  contents: string;
}

function generatedHeader(spec: ComponentSpec, note: string): string {
  const lines = [
    "GENERATED FILE. Do not edit by hand — your changes will be silently",
    `overwritten. Source: components/${spec.id}/spec.json (version ${spec.version}).`,
    `Regenerate with \`ds build ${spec.id}\`. ${note}`,
  ];
  return ["/**", ...lines.map((l) => ` * ${l}`), " */"].join("\n");
}

function propNamed(spec: ComponentSpec, name: string): PropDef | undefined {
  return spec.props.find((p) => p.name === name);
}

/**
 * user-event's `{Key}` bracket syntax matches against the descriptor's
 * `KeyboardEvent.key` value case-insensitively — which works directly for
 * a spec keyboard-map entry like "Enter" (key: "Enter"), but not "Space":
 * the space bar's real `key` value is a literal " " character, not the
 * word "Space", so `{Space}` silently resolves to an unknown key and never
 * dispatches a click. `{ }` (a literal space between the braces) is the
 * descriptor that actually matches.
 */
function userEventKeySequence(specKeyName: string): string {
  if (specKeyName.toLowerCase() === "space") return "{ }";
  return `{${specKeyName}}`;
}

/** A literal value for any non-function prop this spec requires, so a render can always be constructed. */
function placeholderFor(prop: PropDef): string {
  if (prop.default !== undefined) return JSON.stringify(prop.default);
  switch (prop.type) {
    case "enum":
      return JSON.stringify(prop.values![0]);
    case "string":
      return `""`;
    case "number":
      return "0";
    case "boolean":
      return "false";
    case "node":
      return "null";
    default:
      return "undefined";
  }
}

function baseAttrs(spec: ComponentSpec, exclude: Set<string>): string {
  const attrs: string[] = [];
  for (const prop of spec.props) {
    if (exclude.has(prop.name)) continue;
    if (prop.type === "function") {
      attrs.push(`${prop.name}={() => {}}`);
    } else if (prop.required) {
      attrs.push(`${prop.name}={${placeholderFor(prop)}}`);
    }
  }
  return attrs.join(" ");
}

/**
 * `overrides` maps prop name -> the JSX attribute source for it (e.g.
 * `disabled` -> `"disabled"`, `onPress` -> `onPress={onPress}`). Keyed by
 * name so an override for a prop `baseAttrs` would otherwise supply (like
 * the required `onPress`) replaces it instead of duplicating the attribute.
 */
function renderExpr(spec: ComponentSpec, overrides: Record<string, string>): string {
  const hasLabel = spec.anatomy.parts.some((p) => p.name === "label");
  const attrs = [baseAttrs(spec, new Set(Object.keys(overrides))), ...Object.values(overrides)]
    .filter(Boolean)
    .join(" ");
  return hasLabel
    ? `render(<${spec.name} ${attrs}>${spec.name}</${spec.name}>)`
    : `render(<${spec.name} ${attrs} />)`;
}

/**
 * Conformance tests generated straight from the accessibility block: role,
 * keyboard map, ARIA conditions, contrast pairs. Runs against the real
 * generated React component — no mocks — so a regression in the generator
 * or a spec edit that quietly breaks a11y fails `pnpm test`, not just a
 * human eyeballing the docs site.
 */
export function generateConformanceTests(spec: ComponentSpec): GeneratedFile[] {
  const { accessibility } = spec;
  const functionProps = spec.props.filter((p) => p.type === "function");
  const activationProp = functionProps.length === 1 ? functionProps[0] : undefined;
  const disabledProp = propNamed(spec, "disabled");

  const lines: string[] = [
    generatedHeader(spec, "Web conformance — role, keyboard, ARIA, contrast."),
    `import * as React from "react";`,
    `import { describe, it, expect, vi } from "vitest";`,
    `import { render, screen } from "@testing-library/react";`,
    `import userEvent from "@testing-library/user-event";`,
    `import "@testing-library/jest-dom/vitest";`,
    `import { resolveToken, contrastRatio, type TokenTree } from "@ds-platform/core";`,
    `import { ${spec.name} } from "../react/${spec.name}.js";`,
    `import "../react/${spec.id}.css";`,
    `import "../react/tokens.css";`,
    `import rawTokens from "../../tokens/tokens.json";`,
    "",
    `const tokens = rawTokens as unknown as TokenTree;`,
    "",
    `describe("${spec.name} conformance (web)", () => {`,
  ];

  lines.push(
    `  it('exposes role "${accessibility.role}"', () => {`,
    `    ${renderExpr(spec, {})};`,
    `    expect(screen.getByRole(${JSON.stringify(accessibility.role)})).toBeInTheDocument();`,
    `  });`,
    ""
  );

  if (activationProp) {
    for (const [key, condition] of Object.entries(accessibility.keyboard)) {
      lines.push(
        `  it(${JSON.stringify(`${key}: ${condition}`)}, async () => {`,
        `    const ${activationProp.name} = vi.fn();`,
        `    ${renderExpr(spec, {
          [activationProp.name]: `${activationProp.name}={${activationProp.name}}`,
        })};`,
        `    const user = userEvent.setup();`,
        `    screen.getByRole(${JSON.stringify(accessibility.role)}).focus();`,
        `    await user.keyboard(${JSON.stringify(userEventKeySequence(key))});`,
        `    expect(${activationProp.name}).toHaveBeenCalled();`,
        `  });`,
        ""
      );
    }
  }

  for (const aria of accessibility.aria) {
    const matched = matchedBooleanProps(aria.condition, spec.props);
    if (matched.length === 0) continue;

    lines.push(
      `  it(${JSON.stringify(`${aria.attribute} is absent when ${matched.map((p) => p.name).join(", ")} are all false`)}, () => {`,
      `    const { getByRole, unmount } = ${renderExpr(spec, {})};`,
      `    expect(getByRole(${JSON.stringify(accessibility.role)})).not.toHaveAttribute(${JSON.stringify(aria.attribute)});`,
      `    unmount();`,
      `  });`,
      ""
    );

    for (const prop of matched) {
      lines.push(
        `  it(${JSON.stringify(`${aria.attribute}="true" when ${prop.name} is true — "${aria.condition}"`)}, () => {`,
        `    const { getByRole, unmount } = ${renderExpr(spec, { [prop.name]: prop.name })};`,
        `    expect(getByRole(${JSON.stringify(accessibility.role)})).toHaveAttribute(${JSON.stringify(aria.attribute)}, "true");`,
        `    unmount();`,
        `  });`,
        ""
      );
    }
  }

  accessibility.contrast.forEach((pair) => {
    lines.push(
      `  it(${JSON.stringify(`contrast for "${pair.part}" (foreground ${pair.foreground}) meets ${pair.minRatio}:1`)}, () => {`,
      `    const fg = resolveToken(${JSON.stringify(pair.foreground)}, tokens);`,
      `    const bg = resolveToken(${JSON.stringify(pair.background)}, tokens);`,
      `    const ratio = contrastRatio(String(fg.value), String(bg.value));`,
      `    expect(ratio).toBeGreaterThanOrEqual(${pair.minRatio});`,
      `  });`,
      ""
    );
  });

  lines.push(`});`, "");

  const webTest = { filePath: `${spec.name}.conformance.test.tsx`, contents: lines.join("\n") };

  // --- native smoke test: proves the react-native output actually renders
  // (via react-native-web, aliased in vitest.config.ts) for every legal
  // enum combo and every prop-driven state, the same coverage bar
  // build.ts's smoke check holds the web output to.
  const combos = legalCombos(spec);
  const nativeLines: string[] = [
    generatedHeader(spec, "Native smoke test — renders via react-native-web."),
    `import * as React from "react";`,
    `import { describe, it, expect } from "vitest";`,
    `import { render } from "@testing-library/react";`,
    `import { ${spec.name} } from "../react-native/${spec.name}.js";`,
    "",
    `describe("${spec.name} conformance (native)", () => {`,
  ];
  for (const combo of combos) {
    const comboOverrides = Object.fromEntries(
      Object.entries(combo).map(([k, v]) => [k, `${k}={${JSON.stringify(v)}}`])
    );
    const label = Object.values(combo).join(" / ") || "default";
    nativeLines.push(
      `  it(${JSON.stringify(`renders ${label}`)}, () => {`,
      `    const { unmount } = ${renderExpr(spec, comboOverrides)};`,
      `    unmount();`,
      `  });`,
      ""
    );
  }
  if (disabledProp) {
    nativeLines.push(
      `  it("renders disabled", () => {`,
      `    const { unmount } = ${renderExpr(spec, { disabled: "disabled" })};`,
      `    unmount();`,
      `  });`,
      ""
    );
  }
  if (propNamed(spec, "loading")) {
    nativeLines.push(
      `  it("renders loading", () => {`,
      `    const { unmount } = ${renderExpr(spec, { loading: "loading" })};`,
      `    unmount();`,
      `  });`,
      ""
    );
  }
  nativeLines.push(`});`, "");

  const nativeTest = { filePath: `${spec.name}.native-smoke.test.tsx`, contents: nativeLines.join("\n") };

  return [webTest, nativeTest];
}
