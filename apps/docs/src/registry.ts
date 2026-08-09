import type { ComponentType } from "react";
import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core/schema";

export interface ComponentEntry {
  spec: ComponentSpec;
  /** The real generated component, imported straight from generated/react — never a mock. */
  Component: ComponentType<Record<string, unknown>>;
  /** Raw CHANGELOG.md text for this component, if `ds` has generated one yet (Phase 6). */
  changelog?: string;
}

const specModules = import.meta.glob("../../../components/*/spec.json", { eager: true }) as Record<
  string,
  { default: unknown }
>;

const componentModules = import.meta.glob("../../../generated/react/*.tsx", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

const changelogModules = import.meta.glob("../../../components/*/CHANGELOG.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function findComponent(spec: ComponentSpec): ComponentType<Record<string, unknown>> | undefined {
  const entry = Object.entries(componentModules).find(([path]) => path.endsWith(`/${spec.name}.tsx`));
  return entry?.[1]?.[spec.name] as ComponentType<Record<string, unknown>> | undefined;
}

function findChangelog(spec: ComponentSpec): string | undefined {
  const entry = Object.entries(changelogModules).find(([path]) => path.includes(`/${spec.id}/CHANGELOG.md`));
  return entry?.[1];
}

/**
 * Every spec that has generated React output, sorted by name. A spec
 * without a matching generated component (never built, or build failed)
 * is left out rather than shown broken — `ds build` is what fixes that,
 * not a docs-app workaround.
 */
interface Candidate {
  spec: ComponentSpec;
  Component: ComponentType<Record<string, unknown>> | undefined;
  changelog?: string;
}

function hasComponent(candidate: Candidate): candidate is ComponentEntry {
  return candidate.Component !== undefined;
}

export const registry: ComponentEntry[] = Object.values(specModules)
  .map((mod) => ComponentSpecSchema.parse(mod.default))
  .map((spec): Candidate => ({ spec, Component: findComponent(spec), changelog: findChangelog(spec) }))
  .filter(hasComponent)
  .sort((a, b) => a.spec.name.localeCompare(b.spec.name));
