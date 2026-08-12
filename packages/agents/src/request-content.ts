import { z } from "zod";
import { callModel } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

export const RequestContentDraftSchema = z.object({
  problem: z
    .string()
    .min(1)
    .describe(
      "2-4 sentences: what need this component fills, in the voice of someone filing an internal request."
    ),
  notes: z
    .string()
    .default("")
    .describe("Optional supporting detail — edge cases, related components. Empty string if nothing substantive."),
  expectedVariants: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('2-5 short variant names, e.g. "primary", "with-icon" — not full prop definitions.'),
});
export type RequestContentDraft = z.infer<typeof RequestContentDraftSchema>;

const SYSTEM_PROMPT = `You help engineers and PMs file design-system component requests. Given a
component's kebab-case id (if provided), its category, and an optional one-line hint, draft the
free-text fields of a request: what need the component fills (2-4 concrete sentences, specific to
this component and category — not generic boilerplate), notes worth flagging (leave empty if there's
nothing substantive to add), and 2-5 short expected variant names. This is a first draft for a human
to review and edit before filing — stay grounded in a plausible real product need, and don't invent
project-specific details you have no basis for.`;

/**
 * Fills RequestForm's problem/notes/expectedVariants fields from just an id,
 * category, and an optional hint — for testing the wizard without hand-
 * writing a request. Not a final request: the human still reviews it before
 * filing (see draftSpecFromAnswers's equivalent "draft" posture).
 */
export async function generateRequestContent(
  client: ModelClient,
  model: string,
  input: { name?: string; category: string; hint?: string }
): Promise<RequestContentDraft> {
  const parts = [
    input.name ? `Component id: "${input.name}"` : "Component id: (not yet chosen)",
    `Category: ${input.category}`,
    input.hint?.trim() ? `Hint: ${input.hint.trim()}` : "Hint: (none given — invent a plausible need)",
  ];

  return callModel(client, model, {
    schema: RequestContentDraftSchema,
    schemaName: "request_content_draft",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: parts.join("\n") }],
  });
}
