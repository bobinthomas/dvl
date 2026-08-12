import { z } from "zod";
import type { ComponentSpec } from "@ds-platform/core";
import { callModel } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

export const DocQualitySchema = z.object({
  rating: z.enum(["adequate", "needs-improvement"]),
  issues: z
    .array(z.string())
    .default([])
    .describe('For "needs-improvement" only: specifically what a reader would find unclear or missing.'),
});
export type DocQuality = z.infer<typeof DocQualitySchema>;

function renderSpecForReview(spec: ComponentSpec): string {
  const props = spec.props
    .map((p) => `  - ${p.name} (${p.type}${p.required ? ", required" : ""}): ${p.description}`)
    .join("\n");
  const examples = spec.examples
    .map((e) => `  - ${e.name} [state: ${e.state}]${e.description ? `: ${e.description}` : ""}`)
    .join("\n");
  const a11y = spec.accessibility.requirements.map((r) => `  - ${r}`).join("\n");
  const keyboard = Object.entries(spec.accessibility.keyboard)
    .map(([key, behavior]) => `  - ${key}: ${behavior}`)
    .join("\n");

  return [
    `id: ${spec.id}`,
    `name: ${spec.name}`,
    `status: ${spec.status}`,
    `description: ${spec.description}`,
    `props:\n${props || "  (none)"}`,
    `examples:\n${examples || "  (none)"}`,
    `accessibility role: ${spec.accessibility.role}`,
    `accessibility requirements:\n${a11y || "  (none)"}`,
    `keyboard behavior:\n${keyboard || "  (none)"}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `You are a design-systems documentation reviewer. Given a component spec, judge
whether its documentation (description, examples, accessibility requirements, keyboard behavior) is
proper enough for another engineer to adopt the component correctly without asking questions.

Rate "adequate" only if:
- the description explains the component's intent and, where relevant, when NOT to use it
- examples read as meaningfully distinct from each other, not near-duplicates
- accessibility requirements and keyboard behavior are specific to this component, not generic
  boilerplate that could apply to anything

Otherwise rate "needs-improvement" and list exactly what's unclear, missing, or boilerplate. Be
specific — point at the field a reader would find lacking, not a vague overall impression.`;

/**
 * Judges documentation quality on a spec that has already passed schema
 * validation — Zod's `.min(1)` checks only prove fields are non-empty, not
 * that they're clear or specific. This is the qualitative check on top.
 */
export async function runDocQualityCheck(
  client: ModelClient,
  model: string,
  spec: ComponentSpec
): Promise<DocQuality> {
  return callModel(client, model, {
    schema: DocQualitySchema,
    schemaName: "doc_quality",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Component spec:\n\n${renderSpecForReview(spec)}`,
      },
    ],
  });
}
