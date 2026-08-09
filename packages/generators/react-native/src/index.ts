import type { ComponentSpec, TokenTree } from "@ds-platform/core";
import { generatedHeader } from "./header.js";
import { buildTypesBlock, buildComponentBlock } from "./component-body.js";
import { buildStylesBlock } from "./styles-block.js";
import { renderTemplate } from "./render-template.js";

export interface GeneratedFile {
  /** Relative to generated/react-native/ */
  filePath: string;
  contents: string;
}

/**
 * Renders the RN component .tsx from a validated spec and the resolved
 * token tree. Pure — no I/O. The second renderer from the same spec: same
 * props, same states, same invalidCombinations-pruned type union as the
 * web output, proving the spec (not the React generator) is the platform's
 * single source of truth.
 */
export function generateReactNative(spec: ComponentSpec, tokens: TokenTree): GeneratedFile[] {
  const tsx = renderTemplate("component.tsx.hbs", {
    header: generatedHeader(spec),
    typesBlock: buildTypesBlock(spec),
    componentBlock: buildComponentBlock(spec),
    stylesBlock: buildStylesBlock(spec, tokens),
  });

  return [{ filePath: `${spec.name}.tsx`, contents: tsx }];
}
