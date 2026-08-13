import * as React from "react";
import { tokenTreeToCssVariables } from "@ds-platform/generator-react/token-css-vars";
import { tokens } from "./tokens.js";
import type { ComponentEntry } from "./registry.js";

const STYLE_ELEMENT_ID = "ds-generated-component-styles";

/**
 * The live preview never applied any of a component's actual generated
 * CSS — every Variant Gallery box has always rendered as unstyled markup,
 * button and status-indicator included, not just components with custom
 * anatomy. `reactCss` already came back from /api/dev/components/list;
 * nothing downstream of registry.ts ever used it.
 *
 * Injects one aggregate <style> tag: the token CSS variables every
 * generated component's rules reference, computed client-side (no fs, no
 * Style Dictionary — see token-css-vars.ts, the only reason this can run in
 * a browser at all), followed by each loaded component's own CSS with its
 * `@import "./tokens.css"` line stripped — that relative import can't
 * resolve inside an injected <style> tag, and the variables it needs are
 * already provided by the block above it.
 */
export function useInjectedStyles(entries: ComponentEntry[]): void {
  React.useEffect(() => {
    let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ELEMENT_ID;
      document.head.appendChild(styleEl);
    }
    const componentCss = entries
      .map((entry) => entry.reactCss?.replace(/^@import\s+["']\.\/tokens\.css["'];?\s*$/m, "") ?? "")
      .join("\n\n");
    styleEl.textContent = `${tokenTreeToCssVariables(tokens)}\n\n${componentCss}`;
  }, [entries]);
}
