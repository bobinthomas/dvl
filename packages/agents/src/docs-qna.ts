import { z } from "zod";
import type { ComponentSpec } from "@ds-platform/core";
import { callModel } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

export const DocsAnswerSchema = z.object({
  grounded: z
    .boolean()
    .describe("True only if the answer is directly supported by the provided spec bundle."),
  answer: z
    .string()
    .describe(
      'The answer if grounded. If not grounded, a plain, confident statement that the spec bundle doesn\'t cover this — not an apology, not a guess.'
    ),
  citedComponent: z.string().optional().describe("The spec id the answer was drawn from, if grounded."),
});
export type DocsAnswer = z.infer<typeof DocsAnswerSchema>;

const SYSTEM_PROMPT = `You answer questions about a design system using ONLY the component specs
provided in context. Never use outside knowledge of design systems in general, and never guess at
what a spec probably says.

If the bundle answers the question, set grounded: true, give a precise answer, and cite the
component id.

If the bundle does not answer the question — because no relevant spec is in context, or the specs
that are present simply don't cover it — set grounded: false and say so plainly and confidently:
"The spec bundle doesn't cover that" or similar, naming what's missing. Do not apologize, do not
hedge, and do not fall back on general design-systems knowledge to fill the gap. This refusal is a
feature: the platform's whole premise is that the spec is the only source of truth, so answering
from outside it would be worse than refusing.`;

function summarizeSpec(spec: ComponentSpec): string {
  return JSON.stringify(
    {
      id: spec.id,
      name: spec.name,
      status: spec.status,
      description: spec.description,
      props: spec.props.map((p) => ({
        name: p.name,
        type: p.type,
        values: p.values,
        default: p.default,
        description: p.description,
      })),
      states: spec.states,
      invalidCombinations: spec.invalidCombinations,
      accessibility: spec.accessibility,
    },
    null,
    2
  );
}

/**
 * Answers strictly from the spec bundle passed in — never the full
 * components/ directory implicitly, so a caller controls exactly what's
 * "in scope" for a given answer (e.g. a docs page for one component should
 * only ground answers in that component's own spec).
 */
export async function answerDocsQuestion(
  client: ModelClient,
  model: string,
  specs: ComponentSpec[],
  question: string
): Promise<DocsAnswer> {
  const bundle =
    specs.length > 0
      ? specs.map(summarizeSpec).join("\n\n")
      : "(the spec bundle provided for this question is empty)";

  return callModel(client, model, {
    schema: DocsAnswerSchema,
    schemaName: "docs_answer",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Spec bundle:\n\n${bundle}\n\n---\n\nQuestion: ${question}`,
      },
    ],
  });
}
