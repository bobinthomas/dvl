/**
 * Derives the published JSON Schema from the Zod schema — never the other
 * way round. Run via `pnpm schema:emit`. The output file is generated;
 * hand-editing it is pointless, the next emit overwrites it.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ComponentSpecSchema } from "./schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "..", "..", "schemas", "component.schema.json");

const jsonSchema = zodToJsonSchema(ComponentSpecSchema, {
  name: "ComponentSpec",
  $refStrategy: "none",
});

const output = {
  $comment:
    "GENERATED FILE. Source: packages/core/src/schema.ts. Run `pnpm schema:emit` to regenerate. Do not hand-edit — the spec is the source of truth, and this schema is derived from the Zod contract, not the reverse.",
  ...jsonSchema,
};

writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
console.log(`wrote ${outPath}`);
