import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Handlebars from "handlebars";

const here = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(here, "..", "templates");

const cache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Compiles a template with escaping disabled — the output is TypeScript
 * source, not HTML, and Handlebars' default HTML-escaping would corrupt
 * quotes and angle brackets in generated code.
 */
function getTemplate(name: string): HandlebarsTemplateDelegate {
  let template = cache.get(name);
  if (!template) {
    const source = readFileSync(join(templatesDir, name), "utf-8");
    template = Handlebars.compile(source, { noEscape: true });
    cache.set(name, template);
  }
  return template;
}

export function renderTemplate(name: string, context: Record<string, unknown>): string {
  return getTemplate(name)(context);
}
