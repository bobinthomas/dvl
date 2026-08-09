import type { ComponentSpec } from "@ds-platform/core";

/**
 * Every generated file carries this header. No timestamp — a generated
 * file must be byte-identical on every run given the same spec, or the
 * sync gate (`ds check`) can never pass. Mirrors generator-react's header;
 * duplicated rather than imported since generator modules are independent
 * per BUILD-PROMPT's repo layout — one module per target, no cross-target
 * coupling.
 */
export function generatedHeader(spec: ComponentSpec): string {
  const lines = [
    "GENERATED FILE. Do not edit by hand — your changes will be silently",
    `overwritten. Source: components/${spec.id}/spec.json (version ${spec.version}).`,
    "Regenerate with `ds build " + spec.id + "`. Behaviour that can't be",
    `expressed here belongs in overrides/${spec.id}/.`,
  ];
  return ["/**", ...lines.map((l) => ` * ${l}`), " */"].join("\n");
}
