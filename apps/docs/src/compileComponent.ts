import * as React from "react";
import { transform } from "sucrase";
import type { ComponentType } from "react";

/**
 * Turns generator-react's output source into a live component in the
 * browser — the deployed Worker has no filesystem, so there's no
 * `/@fs/<repoRoot>/generated/react/<Name>.tsx` URL for a real dynamic
 * `import()` to resolve (see registry.ts's old approach, kept for
 * `pnpm dev`). Sucrase transpiles TSX to CommonJS (no type-checking, no
 * bundling — generator-react's output only ever imports `react`, per
 * header.ts, so that's the only module this needs to resolve), and this
 * evaluates the result with a `require` shim standing in for a real module
 * loader.
 */
export function compileComponent(source: string, exportName: string): ComponentType<Record<string, unknown>> | undefined {
  const { code } = transform(source, { transforms: ["typescript", "jsx", "imports"] });

  const moduleObj = { exports: {} as Record<string, unknown> };
  function require(specifier: string): unknown {
    if (specifier === "react") return React;
    throw new Error(`generated component source imports unsupported module "${specifier}"`);
  }

  // eslint-disable-next-line no-new-func -- the only way to run freshly generated source with no bundler in the loop
  const run = new Function("exports", "require", "module", code);
  run(moduleObj.exports, require, moduleObj);

  return moduleObj.exports[exportName] as ComponentType<Record<string, unknown>> | undefined;
}
