import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ComponentSpecSchema,
  findSpecFiles,
  loadTokens,
  specPathForId,
  type ComponentSpec,
} from "@ds-platform/core";
import { validateSpecFile, formatResult } from "@ds-platform/validator";
import { compileTokensToCss, generateReact } from "@ds-platform/generator-react";
import { generateReactNative } from "@ds-platform/generator-react-native";
import { generateStories } from "@ds-platform/generator-stories";
import { generateConformanceTests } from "@ds-platform/generator-tests";
import { loadDsConfig } from "../config.js";

export interface BuildOptions {
  cwd: string;
}

const PSEUDO_CLASS_STATES = new Set(["hover", "active", "focus"]);

function pseudoSelectorFor(state: string): string {
  return state === "focus" ? ":focus-visible" : `:${state}`;
}

export function loadValidSpec(cwd: string, id: string): ComponentSpec | undefined {
  const specPath = specPathForId(join(cwd, "components"), id);
  const tokensPath = join(cwd, "tokens", "tokens.json");
  const result = validateSpecFile(specPath, tokensPath);
  if (!result.valid) {
    console.error(formatResult(result));
    return undefined;
  }
  const raw = JSON.parse(readFileSync(specPath, "utf-8"));
  return ComponentSpecSchema.parse(raw);
}

/**
 * Proves "the generated component renders and every variant, size, and
 * state in the spec is reachable" instead of just asserting it: actually
 * imports and renders the freshly generated component for every declared
 * example, then checks that the union of examples exercises every enum
 * value and every prop-driven state. Pseudo-class states (hover/active/
 * focus) aren't triggerable via a server render, so those are checked by
 * confirming the generated CSS declares the matching selector instead.
 */
async function smokeRenderCheck(
  spec: ComponentSpec,
  componentFilePath: string,
  cssContents: string
): Promise<string[]> {
  const problems: string[] = [];
  const mod = await import(`${pathToFileURL(componentFilePath).href}?t=${Date.now()}`);
  const Component = mod[spec.name];
  if (!Component) {
    return [`generated module does not export "${spec.name}"`];
  }

  const functionProps = spec.props.filter((p) => p.type === "function");
  const enumProps = spec.props.filter((p) => p.type === "enum");
  const reachedEnumValues = new Map<string, Set<string>>(enumProps.map((p) => [p.name, new Set()]));
  const reachedStates = new Set<string>();

  for (const example of spec.examples) {
    const props: Record<string, unknown> = { ...example.props };
    for (const fp of functionProps) {
      if (!(fp.name in props)) props[fp.name] = () => {};
    }

    try {
      const markup = renderToStaticMarkup(React.createElement(Component, props));
      if (!markup) {
        problems.push(`example "${example.name}" rendered empty output`);
      }
    } catch (err) {
      problems.push(`example "${example.name}" threw while rendering: ${(err as Error).message}`);
      continue;
    }

    for (const prop of enumProps) {
      const value = String(props[prop.name] ?? prop.default);
      reachedEnumValues.get(prop.name)!.add(value);
    }
    reachedStates.add(example.state);
  }

  for (const prop of enumProps) {
    const missing = (prop.values ?? []).filter((v) => !reachedEnumValues.get(prop.name)!.has(v));
    if (missing.length > 0) {
      problems.push(`prop "${prop.name}" never reaches value(s) [${missing.join(", ")}] in any example`);
    }
  }

  for (const state of spec.states) {
    if (PSEUDO_CLASS_STATES.has(state)) {
      const selector = pseudoSelectorFor(state);
      if (!cssContents.includes(selector)) {
        problems.push(`state "${state}" has no ${selector} rule in the generated CSS`);
      }
    } else if (!reachedStates.has(state)) {
      problems.push(`state "${state}" is never used by any example`);
    }
  }

  return problems;
}

export function idsToBuild(cwd: string, id: string | undefined): string[] {
  if (id) return [id];
  return findSpecFiles(join(cwd, "components")).map((specPath) => basename(dirname(specPath)));
}

export async function runBuild(id: string | undefined, options: BuildOptions): Promise<boolean> {
  const { cwd } = options;
  const ids = idsToBuild(cwd, id);
  if (ids.length === 0) {
    console.error(`no specs found under ${join(cwd, "components")}`);
    return false;
  }

  const config = loadDsConfig(cwd);
  const tokens = loadTokens(join(cwd, "tokens", "tokens.json"));

  const reactDir = join(cwd, "generated", "react");
  const nativeDir = join(cwd, "generated", "react-native");
  const storiesDir = join(cwd, "generated", "stories");
  const testsDir = join(cwd, "generated", "tests");
  mkdirSync(reactDir, { recursive: true });
  mkdirSync(nativeDir, { recursive: true });
  if (config.generation.code.include_storybook) mkdirSync(storiesDir, { recursive: true });
  if (config.generation.code.include_unit_tests) mkdirSync(testsDir, { recursive: true });

  const tokensCss = await compileTokensToCss(join(cwd, "tokens", "tokens.json"), reactDir);

  let allOk = true;
  for (const componentId of ids) {
    const spec = loadValidSpec(cwd, componentId);
    if (!spec) {
      allOk = false;
      continue;
    }

    const files = generateReact(spec);
    for (const file of files) {
      writeFileSync(join(reactDir, file.filePath), file.contents, "utf-8");
    }

    const componentFile = files.find((f) => f.filePath.endsWith(".tsx"))!;
    const cssFile = files.find((f) => f.filePath.endsWith(".css"))!;
    const problems = await smokeRenderCheck(
      spec,
      join(reactDir, componentFile.filePath),
      cssFile.contents + tokensCss
    );

    if (problems.length > 0) {
      allOk = false;
      console.error(`FAIL  ${spec.id} (generated, but failed the render/coverage check)`);
      for (const p of problems) console.error(`  ${p}`);
      continue;
    }
    console.log(`BUILT ${spec.id} -> generated/react/${componentFile.filePath}, generated/react/${cssFile.filePath}`);

    for (const file of generateReactNative(spec, tokens)) {
      writeFileSync(join(nativeDir, file.filePath), file.contents, "utf-8");
      console.log(`BUILT ${spec.id} -> generated/react-native/${file.filePath}`);
    }

    if (config.generation.code.include_storybook) {
      for (const file of generateStories(spec)) {
        writeFileSync(join(storiesDir, file.filePath), file.contents, "utf-8");
        console.log(`BUILT ${spec.id} -> generated/stories/${file.filePath}`);
      }
    }

    if (config.generation.code.include_unit_tests) {
      for (const file of generateConformanceTests(spec)) {
        writeFileSync(join(testsDir, file.filePath), file.contents, "utf-8");
        console.log(`BUILT ${spec.id} -> generated/tests/${file.filePath}`);
      }
    }
  }

  if (allOk) {
    console.log(`BUILT generated/react/tokens.css`);
  }

  return allOk;
}
