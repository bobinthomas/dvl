import type { TokenTree } from "@ds-platform/core/tokens";
import rawTokens from "../../../tokens/tokens.json";

/**
 * The compiled JS object Vite bundles from tokens/tokens.json — the exact
 * same file `ds build` compiles to generated/react/tokens.css. Editing
 * tokens.json and re-running `ds build` changes both outputs from the
 * same source, so there's nothing here for a hand edit to drift from.
 */
export const tokens = rawTokens as unknown as TokenTree;
