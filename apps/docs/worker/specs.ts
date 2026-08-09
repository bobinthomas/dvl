/**
 * The docs Q&A route's spec bundle. Wrangler's bundler resolves JSON
 * imports at build time — a Worker has no filesystem to glob at runtime the
 * way the CLI or the Vite docs app can (`findSpecFiles`, `import.meta.glob`).
 * Add a new `import` line here when a new component ships; there's exactly
 * one component today, so a generated import list isn't worth building yet.
 */
import buttonSpec from "../../../components/button/spec.json";

export const rawSpecs: unknown[] = [buttonSpec];
