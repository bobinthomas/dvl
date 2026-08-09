import type { ComponentSpec, TokenTree } from "@ds-platform/core";
import { matchSelector, type SelectorContext } from "@ds-platform/core/selector";
import { resolveToken } from "@ds-platform/core/tokens";

/**
 * CSS-flavored property name (as used in spec.tokens[].properties) -> RN
 * StyleSheet property name. RN has no logical padding properties, so the
 * block/inline axis names spec.json uses for the web output get mapped to
 * their RN vertical/horizontal equivalents.
 */
const CSS_TO_RN_PROPERTY: Record<string, string> = {
  paddingBlock: "paddingVertical",
  paddingInline: "paddingHorizontal",
  backgroundColor: "backgroundColor",
  borderColor: "borderColor",
  borderRadius: "borderRadius",
  color: "color",
  fontSize: "fontSize",
};

function toRNValue(raw: string | number): string | number {
  if (typeof raw === "number") return raw;
  const match = /^(-?\d*\.?\d+)px$/.exec(raw);
  return match ? Number(match[1]) : raw;
}

/**
 * Resolves one anatomy part's style under a given prop/state context to a
 * concrete RN style object. The web generator leans on the browser's CSS
 * cascade to reproduce matchSelector's specificity rules for free; RN has
 * no cascade to lean on, so this calls the same core matchSelector core
 * uses for validation and pre-resolves every token reference to a literal
 * value at generation time instead.
 */
export function resolvePartStyle(
  spec: ComponentSpec,
  part: string,
  ctx: SelectorContext,
  tokens: TokenTree
): Record<string, string | number> {
  const bound = matchSelector(spec.tokens, part, ctx);
  const style: Record<string, string | number> = {};
  for (const [cssProp, ref] of Object.entries(bound)) {
    const rnProp = CSS_TO_RN_PROPERTY[cssProp];
    if (!rnProp) continue;
    const resolved = resolveToken(ref, tokens);
    style[rnProp] = toRNValue(resolved.value);
  }
  // A part can declare a borderColor with no borderWidth (the spec never
  // needs one on web — an unstyled border is simply invisible there). RN
  // views render no border at all without an explicit width, so one is
  // implied here to keep the two platforms visually consistent.
  if (style.borderColor !== undefined && style.borderWidth === undefined) {
    style.borderWidth = 1;
  }
  return style;
}
