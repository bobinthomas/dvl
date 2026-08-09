import { z } from "zod";
import { ComponentSpecSchema, type ComponentSpec } from "@ds-platform/core";
import { callModel } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

export const InterviewQuestionSchema = z.object({
  id: z.string().describe("short slug for this question, e.g. \"invalid-combinations\"."),
  prompt: z.string().describe("The question to ask the human, in plain language."),
  why: z.string().describe("One sentence on why the PRD doesn't already answer this."),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const InterviewQuestionsSchema = z.object({
  questions: z.array(InterviewQuestionSchema),
});
export type InterviewQuestions = z.infer<typeof InterviewQuestionsSchema>;

const QUESTIONS_SYSTEM_PROMPT = `You are conducting a design-system component intake interview. A PRD describes
a product need; you must draft a component spec from it, but specs require decisions a PRD never makes:
intent (when to use this component vs. an alternative), when NOT to use it, which prop/state
combinations are invalid, the full accessibility contract (role, keyboard behavior, ARIA states,
contrast requirements), and content rules (label length, tone). Ask the human only the questions the
PRD's text genuinely leaves open — don't ask something the PRD already answered. Ask 3-6 questions.`;

/** Step 1: the model reads the PRD and asks only what it genuinely can't answer from it. */
export async function generateInterviewQuestions(
  client: ModelClient,
  model: string,
  componentName: string,
  prdContext: string
): Promise<InterviewQuestions> {
  return callModel(client, model, {
    schema: InterviewQuestionsSchema,
    schemaName: "interview_questions",
    system: QUESTIONS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Component to spec: "${componentName}"\n\nPRD context:\n\n${prdContext}`,
      },
    ],
  });
}

const DRAFT_SYSTEM_PROMPT = `You write component specs for a design system, from a PRD and a human's
answers to your intake interview. Output must conform exactly to the provided JSON schema (the same
schema every hand-authored spec in this platform is validated against). Every token reference must be
a {a.b.c}-style reference — never a raw hex, px, or rem value; if you don't know the exact token to
use, reference a plausible one following the existing naming pattern (color.action.*, spacing.*,
fontSize.*, radius.*) rather than inventing a raw value. Set "status" to "draft" always — this is a
first pass for a human to review and edit, not a finished contract, and you must never claim
completeness you don't have. If the interview didn't cover something the schema requires, make the
most conservative reasonable choice and keep the component's "description" honest about what's
assumed.`;

/** Step 2: draft a spec from the PRD + the human's interview answers. Always forced to status: "draft". */
export async function draftSpecFromAnswers(
  client: ModelClient,
  model: string,
  componentName: string,
  prdContext: string,
  answers: Record<string, string>
): Promise<ComponentSpec> {
  const answersText = Object.entries(answers)
    .map(([id, answer]) => `Q(${id}): ${answer}`)
    .join("\n");

  return callModel(client, model, {
    schema: ComponentSpecSchema,
    schemaName: "component_spec",
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Component to spec: "${componentName}"\n\nPRD context:\n\n${prdContext}\n\nInterview answers:\n\n${answersText}`,
      },
    ],
    // A freshly-interviewed component is never allowed to claim "stable" —
    // forced before validation, not after, so a model that ignores the
    // instruction can't also trip the schema's stable-requires-a11y rule.
    normalize: (raw) =>
      typeof raw === "object" && raw !== null ? { ...raw, status: "draft" } : raw,
  });
}
