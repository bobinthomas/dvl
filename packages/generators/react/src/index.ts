import type { ComponentSpec } from "@ds-platform/core";
import { generatedHeader } from "./header.js";
import { buildTypesBlock, buildComponentBlock } from "./component-body.js";
import { buildComponentCss } from "./css.js";
import { renderTemplate, type TemplateRenderer } from "./render-template.js";

export type { TemplateRenderer } from "./render-template.js";

export interface GeneratedFile {
  /** Relative to generated/react/ */
  filePath: string;
  contents: string;
}

/**
 * Renders the component .tsx and its companion .css from a validated spec.
 * Pure — no I/O, as long as a caller with no filesystem or eval (see
 * render-template.ts) supplies `templateSource` itself.
 */
export function generateReact(spec: ComponentSpec, templateSource?: TemplateRenderer): GeneratedFile[] {
  const tsx = renderTemplate(
    "component.tsx.hbs",
    {
      header: generatedHeader(spec, "block"),
      id: spec.id,
      typesBlock: buildTypesBlock(spec),
      componentBlock: buildComponentBlock(spec),
    },
    templateSource
  );

  return [
    { filePath: `${spec.name}.tsx`, contents: tsx },
    { filePath: `${spec.id}.css`, contents: buildComponentCss(spec) },
  ];
}

export { compileTokensToCss } from "./tokens-css.js";
export { generatedHeader } from "./header.js";
