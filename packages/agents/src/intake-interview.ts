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

export const SuggestedAnswerSchema = z.object({
  answer: z.string().min(1).describe("A plausible, concrete first-draft answer, 1-4 sentences."),
});
export type SuggestedAnswer = z.infer<typeof SuggestedAnswerSchema>;

const QUESTIONS_SYSTEM_PROMPT = `You are conducting a design-system component intake interview. A PRD describes
a product need; you must draft a component spec from it, but specs require decisions a PRD never makes:
intent (when to use this component vs. an alternative), when NOT to use it, which prop/state
combinations are invalid, the full accessibility contract (role, keyboard behavior, ARIA states,
contrast requirements), and content rules (label length, tone). Ask the human only the questions the
PRD's text genuinely leaves open — don't ask something the PRD already answered. Ask 3-6 questions.`;

/**
 * Step 1: the model reads the PRD and asks only what it genuinely can't
 * answer from it. `alreadyAsked` — a Settings-configured standing baseline
 * a human wants asked on every component, regardless of PRD (see
 * mergeStandingQuestions) — is listed so the model adds to that set instead
 * of re-asking the same thing under a different id or wording.
 */
export async function generateInterviewQuestions(
  client: ModelClient,
  model: string,
  componentName: string,
  prdContext: string,
  alreadyAsked: InterviewQuestion[] = []
): Promise<InterviewQuestions> {
  const alreadyAskedText =
    alreadyAsked.length > 0
      ? `\n\nThe following questions are already being asked separately — don't repeat them or ask something that overlaps:\n${alreadyAsked.map((q) => `- ${q.prompt}`).join("\n")}`
      : "";

  return callModel(client, model, {
    schema: InterviewQuestionsSchema,
    schemaName: "interview_questions",
    system: QUESTIONS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Component to spec: "${componentName}"\n\nPRD context:\n\n${prdContext}${alreadyAskedText}`,
      },
    ],
  });
}

/**
 * Merges a human-authored standing baseline of questions (always asked,
 * every component, configured in the docs site's Settings page) with the
 * model's PRD-specific ones — standing questions first, dropping any
 * generated question whose id collides with one already in the standing
 * list. Used identically by dev-server/api.ts and worker/dev-api.ts's
 * /promote/questions handlers.
 */
export function mergeStandingQuestions(standing: InterviewQuestion[], generated: InterviewQuestion[]): InterviewQuestion[] {
  const standingIds = new Set(standing.map((q) => q.id));
  return [...standing, ...generated.filter((q) => !standingIds.has(q.id))];
}

const SUGGEST_ANSWER_SYSTEM_PROMPT = `You are drafting one answer in a design-system component intake
interview, so a human has a starting point instead of a blank textarea. Given the component name, PRD
context, the other questions being asked (context only — don't answer those), and the one question to
answer, write a plausible, concrete 1-4 sentence first-draft answer. Make a reasonable, conservative
judgment call rather than hedging — this is a draft the human will review and edit, not a final
decision.`;

/** One question's worth of "generate with AI" for PromoteForm's interview step — a draft answer, not a final one. */
export async function suggestInterviewAnswer(
  client: ModelClient,
  model: string,
  componentName: string,
  prdContext: string,
  question: InterviewQuestion,
  otherQuestions: InterviewQuestion[]
): Promise<SuggestedAnswer> {
  const otherQuestionsText =
    otherQuestions.length > 0
      ? `Other questions being asked separately (for context only — don't answer these):\n${otherQuestions.map((q) => `- ${q.prompt}`).join("\n")}`
      : "No other questions are being asked.";

  return callModel(client, model, {
    schema: SuggestedAnswerSchema,
    schemaName: "suggested_answer",
    system: SUGGEST_ANSWER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Component to spec: "${componentName}"\n\nPRD context:\n\n${prdContext}\n\n${otherQuestionsText}\n\nQuestion to answer: ${question.prompt}\n(why this is being asked: ${question.why})`,
      },
    ],
  });
}

const DRAFT_SYSTEM_PROMPT = `You write component specs for a design system, from a PRD and a human's
answers to your intake interview. Output must conform exactly to the provided JSON schema (the same
schema every hand-authored spec in this platform is validated against). Every prop name and anatomy
part name must be camelCase — e.g. "iconPosition", "loadingLabel" — never PascalCase ("IconPosition"),
kebab-case ("icon-position"), or snake_case ("icon_position"). Every token reference must be
a {a.b.c}-style reference, and it must be EXACTLY one of the token paths listed in the "Available
tokens" section of the user message — never a raw hex/px/rem value, and never a path you invent by
guessing at this platform's naming convention, even if it looks plausible. If nothing in the list
genuinely fits a given property, prefer the closest available token over inventing one, and note the
gap in the component's "description" rather than silently picking something wrong. Set "status" to
"draft" always — this is a first pass for a human to review and edit, not a finished contract, and you
must never claim completeness you don't have. If the interview didn't cover something the schema
requires, make the most conservative reasonable choice and keep the component's "description" honest
about what's assumed.

Every prop's "type" must be EXACTLY one of "enum", "boolean", "string", "number", "function", or
"node" — never "array", "object", or any other JavaScript/JSON type name, even for a prop that
naturally holds a list or collection (e.g. a set of time slots, a list of tabs). Model that as "node"
if it's rendered content the caller passes in (e.g. a list of child elements), or as "string" if it's
data the component itself parses (e.g. a serialized value) — never invent a type outside those six.

"invalidCombinations" entries are flat objects where every value is a STRING, never a boolean —
including for states. To mark a state as part of an invalid combination, use the key "state" with the
state's name as the string value, e.g. {"state": "loading", "variant": "ghost"} (loading + ghost is
invalid) — never {"loading": true}, which fails validation. Every entry needs at least two keys; use
an empty array if nothing is genuinely invalid.

"examples" must collectively exercise every declared value, not just illustrate the happy path: for
every enum prop, every one of its "values" must be set explicitly (not left to the default) by at
least one example's "props" — combine several remaining values into one example's props where that's
natural, rather than only ever setting one prop per example. Separately, for every state in "states"
that is NOT "hover", "active", or "focus" (those are checked via CSS, not examples), at least one
example's "state" must equal it exactly. Two examples are rarely enough once there's more than one
enum prop or a non-default state — write as many as it takes to cover everything declared, don't
under-declare "values"/"states" just to keep the example count low.`;

const KNOWN_STATES = new Set(["default", "hover", "active", "focus", "disabled", "loading"]);

/**
 * A weaker model sometimes represents "invalid while loading" as
 * {"loading": true} instead of this schema's {"state": "loading"}
 * convention (InvalidCombinationSchema requires every value to be a
 * string) — despite the prompt now spelling out the correct shape. Coerces
 * that one specific, unambiguous confusion before validation rather than
 * relying solely on the retry loop to talk the model out of it a second
 * time. A `false` value carries no information for an "invalid
 * combination" and is dropped rather than guessed at.
 */
function normalizeInvalidCombinations(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { invalidCombinations?: unknown }).invalidCombinations)) {
    return raw;
  }
  const spec = raw as { invalidCombinations: unknown[] };
  const fixed = spec.invalidCombinations.map((combo) => {
    if (typeof combo !== "object" || combo === null) return combo;
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(combo as Record<string, unknown>)) {
      if (typeof value === "boolean" && KNOWN_STATES.has(key)) {
        if (value) next.state = key;
        continue;
      }
      next[key] = value;
    }
    return next;
  });
  return { ...spec, invalidCombinations: fixed };
}

const CAMEL_CASE_OK = /^[a-z][a-zA-Z0-9]*$/;

function toCamelCase(input: string): string {
  const words = input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return input;
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase())).join("");
}

/**
 * A model sometimes names a prop "IconPosition", "icon-position", or
 * "icon_position" instead of this schema's required camelCase, despite the
 * prompt spelling out the convention. Coerces every prop name to camelCase
 * before validation (idempotent for already-correct names) and carries the
 * same rename into invalidCombinations' keys and examples' props — the
 * schema cross-checks invalidCombinations keys against declared prop names
 * (see schema.ts's superRefine), so renaming the prop without updating that
 * reference would just trade one validation failure for another.
 */
function normalizePropNames(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const spec = raw as Record<string, unknown>;
  if (!Array.isArray(spec.props)) return raw;

  const renames = new Map<string, string>();
  const props = spec.props.map((p) => {
    if (typeof p !== "object" || p === null || typeof (p as { name?: unknown }).name !== "string") return p;
    const oldName = (p as { name: string }).name;
    if (CAMEL_CASE_OK.test(oldName)) return p;
    const newName = toCamelCase(oldName);
    renames.set(oldName, newName);
    return { ...p, name: newName };
  });
  if (renames.size === 0) return { ...spec, props };

  const invalidCombinations = Array.isArray(spec.invalidCombinations)
    ? spec.invalidCombinations.map((combo) => {
        if (typeof combo !== "object" || combo === null) return combo;
        const next: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(combo as Record<string, unknown>)) {
          next[renames.get(key) ?? key] = value;
        }
        return next;
      })
    : spec.invalidCombinations;

  const examples = Array.isArray(spec.examples)
    ? spec.examples.map((example) => {
        if (typeof example !== "object" || example === null) return example;
        const exampleProps = (example as { props?: unknown }).props;
        if (typeof exampleProps !== "object" || exampleProps === null) return example;
        const nextProps: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(exampleProps as Record<string, unknown>)) {
          nextProps[renames.get(key) ?? key] = value;
        }
        return { ...example, props: nextProps };
      })
    : spec.examples;

  return { ...spec, props, invalidCombinations, examples };
}

/** Same camelCase fix as normalizePropNames, for anatomy part names — nothing else in the schema cross-references them. */
function normalizeAnatomyPartNames(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const spec = raw as Record<string, unknown>;
  const anatomy = spec.anatomy;
  if (typeof anatomy !== "object" || anatomy === null || !Array.isArray((anatomy as { parts?: unknown }).parts)) {
    return raw;
  }
  const parts = (anatomy as { parts: unknown[] }).parts.map((part) => {
    if (typeof part !== "object" || part === null || typeof (part as { name?: unknown }).name !== "string") return part;
    const name = (part as { name: string }).name;
    return CAMEL_CASE_OK.test(name) ? part : { ...part, name: toCamelCase(name) };
  });
  return { ...spec, anatomy: { ...anatomy, parts } };
}

/**
 * Step 2: draft a spec from the PRD + the human's interview answers. Always
 * forced to status: "draft". `validTokenPaths` is this platform's real,
 * flattened token vocabulary (see @ds-platform/core's flattenTokenPaths) —
 * without it the model has no way to know this platform uses
 * "color.action.*" (not "color.text.*"/"color.background.*") or
 * "fontSize.sm/md/lg" (not "small"/"large"), and can only ever guess at a
 * plausible-sounding path that doesn't actually resolve.
 */
export async function draftSpecFromAnswers(
  client: ModelClient,
  model: string,
  componentName: string,
  prdContext: string,
  answers: Record<string, string>,
  validTokenPaths: string[]
): Promise<ComponentSpec> {
  const answersText = Object.entries(answers)
    .map(([id, answer]) => `Q(${id}): ${answer}`)
    .join("\n");
  const tokensText = validTokenPaths.map((p) => `{${p}}`).join(", ");

  return callModel(client, model, {
    schema: ComponentSpecSchema,
    schemaName: "component_spec",
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Component to spec: "${componentName}"\n\nPRD context:\n\n${prdContext}\n\nInterview answers:\n\n${answersText}\n\nAvailable tokens (use ONLY these, exactly as written):\n${tokensText}`,
      },
    ],
    // A freshly-interviewed component is never allowed to claim "stable" —
    // forced before validation, not after, so a model that ignores the
    // instruction can't also trip the schema's stable-requires-a11y rule.
    normalize: (raw) => {
      const withFixedCombinations = normalizeInvalidCombinations(raw);
      const withFixedPropNames = normalizePropNames(withFixedCombinations);
      const withFixedAnatomyNames = normalizeAnatomyPartNames(withFixedPropNames);
      return typeof withFixedAnatomyNames === "object" && withFixedAnatomyNames !== null
        ? { ...withFixedAnatomyNames, status: "draft" }
        : withFixedAnatomyNames;
    },
  });
}
