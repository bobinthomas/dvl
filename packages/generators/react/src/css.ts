import type { ComponentSpec, ComponentState } from "@ds-platform/core";
import { cssPropertyName, dataAttrName, tokenRefToCssVar } from "./naming.js";
import { generatedHeader } from "./header.js";

/**
 * Interaction states that are browser-native get a pseudo-class; states
 * that are prop-driven (loading has no CSS pseudo-class) get a
 * `data-state` attribute set by the component itself. `default` needs no
 * selector at all — it's the unqualified base rule.
 */
const STATE_SELECTOR: Record<ComponentState, string> = {
  default: "",
  hover: ":hover",
  active: ":active",
  focus: ":focus-visible",
  disabled: '[data-state="disabled"]',
  loading: '[data-state="loading"]',
};

function partSelector(id: string, part: string): string {
  return part === "root" ? `.ds-${id}` : `.ds-${id} [data-part="${part}"]`;
}

/**
 * One CSS rule per token binding, in declaration order. This deliberately
 * does not pre-resolve bindings the way core's selector.ts does for a
 * single known context — instead it leans on the browser's own cascade:
 * each `when` key becomes one attribute selector (or one pseudo-class),
 * so CSS specificity naturally reproduces "more matched keys wins, later
 * declaration wins ties" without any extra sorting here.
 */
export function buildComponentCss(spec: ComponentSpec): string {
  const rules = spec.tokens.map((binding) => {
    let attrSelectors = "";
    let pseudo = "";
    for (const [key, value] of Object.entries(binding.when)) {
      if (key === "state") {
        const sel = STATE_SELECTOR[value as ComponentState] ?? "";
        if (sel.startsWith(":")) pseudo += sel;
        else attrSelectors += sel;
      } else {
        attrSelectors += `[data-${dataAttrName(key)}="${value}"]`;
      }
    }
    const selector = `${partSelector(spec.id, binding.part)}${attrSelectors}${pseudo}`;
    const declarations = Object.entries(binding.properties)
      .map(([prop, ref]) => `  ${cssPropertyName(prop)}: ${tokenRefToCssVar(ref)};`)
      .join("\n");
    return `${selector} {\n${declarations}\n}`;
  });

  // Visible keyboard focus is a platform-wide accessibility default, not a
  // per-component design decision, so it isn't spec-driven like the rules
  // above — every generated component gets it whether or not the spec
  // declares "focus" in its states. currentColor means no token is needed.
  if (spec.states.includes("focus")) {
    rules.push(
      `${partSelector(spec.id, "root")}:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}`
    );
  }

  return `${generatedHeader(spec, "block")}\n@import "./tokens.css";\n\n${rules.join("\n\n")}\n`;
}
