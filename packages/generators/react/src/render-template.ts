import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Handlebars from "handlebars";

const cache = new Map<string, HandlebarsTemplateDelegate>();

type TemplateContext = Record<string, unknown>;
export type TemplateRenderer = (context: TemplateContext) => string;

/**
 * Compiles a template with escaping disabled — the output is TypeScript
 * source, not HTML, and Handlebars' default HTML-escaping would corrupt
 * quotes and angle brackets in generated code.
 */
function getTemplate(name: string): HandlebarsTemplateDelegate {
  let template = cache.get(name);
  if (!template) {
    const text = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "templates", name), "utf-8");
    template = Handlebars.compile(text, { noEscape: true });
    cache.set(name, template);
  }
  return template;
}

/**
 * `source`, when passed, bypasses Handlebars (and the disk read) entirely
 * by rendering the context directly. A deployed Cloudflare Worker needs
 * this for two independent reasons: it has no filesystem for
 * `readFileSync` to read a .hbs file from, and — the harder blocker —
 * `Handlebars.compile()` generates and evaluates a JS function from a
 * string at runtime for speed, which the Workers isolate refuses outright
 * ("Code generation from strings disallowed for this context"), with no
 * compatibility flag to re-enable it. apps/docs/worker/dev-api.ts supplies
 * a small hand-written renderer matching component.tsx.hbs's actual
 * content instead — that template is pure `{{{variable}}}` interpolation
 * with no Handlebars logic, so a plain template literal reproduces it
 * exactly. The CLI (and this package's own tests) never pass `source`, so
 * their behavior — real Handlebars, read from templates/ — is unchanged.
 */
export function renderTemplate(name: string, context: TemplateContext, source?: TemplateRenderer): string {
  if (source) return source(context);
  return getTemplate(name)(context);
}
