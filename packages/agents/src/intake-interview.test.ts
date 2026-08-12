import { describe, it, expect, vi } from "vitest";
import {
  generateInterviewQuestions,
  draftSpecFromAnswers,
  suggestInterviewAnswer,
  InterviewQuestionsSchema,
  SuggestedAnswerSchema,
} from "./intake-interview.js";
import type { ModelClient } from "./gateway-client.js";

function fakeClient(responses: unknown[]): ModelClient {
  let call = 0;
  return {
    complete: vi.fn(async () => {
      const response = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return JSON.stringify(response);
    }),
  };
}

const MINIMAL_VALID_DRAFT = {
  id: "date-picker",
  name: "DatePicker",
  category: "forms",
  status: "stable", // deliberately wrong — normalize() must force this to "draft"
  version: "0.1.0",
  owner: "@ds-lead",
  description: "Lets a customer pick a pickup day from the next 7 available days.",
  anatomy: { root: "div element", parts: [] },
  props: [
    {
      name: "onSelect",
      type: "function",
      description: "Called with the selected date when the customer picks a day.",
      required: true,
      platforms: ["react", "react-native"],
    },
  ],
  states: ["default", "disabled"],
  invalidCombinations: [],
  tokens: [],
  accessibility: {
    role: "grid",
    keyboard: {},
    aria: [],
    contrast: [],
    requirements: [],
  },
  examples: [{ name: "Default", props: {}, state: "default" }],
  overrides: { imports: [] },
};

const SAMPLE_TOKEN_PATHS = ["color.action.primary.default.bg", "spacing.sm", "fontSize.sm"];

describe("generateInterviewQuestions", () => {
  it("returns validated interview questions", async () => {
    const client = fakeClient([
      {
        questions: [
          { id: "intent", prompt: "When should DatePicker be used vs. a plain text date input?", why: "the PRD never contrasts it with alternatives" },
        ],
      },
    ]);
    const result = await generateInterviewQuestions(client, "test/model", "DatePicker", "some PRD context");
    expect(InterviewQuestionsSchema.safeParse(result).success).toBe(true);
    expect(result.questions).toHaveLength(1);
  });
});

describe("draftSpecFromAnswers", () => {
  it("forces status to draft even when the model returns stable", async () => {
    const client = fakeClient([MINIMAL_VALID_DRAFT]);
    const spec = await draftSpecFromAnswers(
      client,
      "test/model",
      "DatePicker",
      "PRD context",
      { intent: "Used for scheduling flows with a bounded date range." },
      SAMPLE_TOKEN_PATHS
    );
    expect(spec.status).toBe("draft");
  });

  it("produces a spec that conforms to the same schema hand-authored specs validate against", async () => {
    const client = fakeClient([MINIMAL_VALID_DRAFT]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.id).toBe("date-picker");
    expect(spec.examples.length).toBeGreaterThan(0);
  });

  it("retries when the model's draft is missing a required field, then succeeds", async () => {
    const { description: _omit, ...missingDescription } = MINIMAL_VALID_DRAFT;
    const client = fakeClient([missingDescription, MINIMAL_VALID_DRAFT]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.status).toBe("draft");
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it("coerces a boolean state flag like {loading: true} into {state: \"loading\"} instead of failing validation", async () => {
    const draftWithBooleanState = {
      ...MINIMAL_VALID_DRAFT,
      invalidCombinations: [{ loading: true, onSelect: "required" }],
    };
    const client = fakeClient([draftWithBooleanState]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.invalidCombinations).toEqual([{ state: "loading", onSelect: "required" }]);
    expect(client.complete).toHaveBeenCalledTimes(1);
  });

  it("drops a {state: false} entry down to nothing, still surfacing a clear validation error rather than crashing", async () => {
    const draftWithFalseState = {
      ...MINIMAL_VALID_DRAFT,
      invalidCombinations: [{ loading: false }],
    };
    const validRetry = { ...MINIMAL_VALID_DRAFT, invalidCombinations: [] };
    const client = fakeClient([draftWithFalseState, validRetry]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.invalidCombinations).toEqual([]);
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it("coerces a PascalCase prop name to camelCase, carrying the rename into invalidCombinations and examples", async () => {
    const draftWithBadPropName = {
      ...MINIMAL_VALID_DRAFT,
      props: [{ ...MINIMAL_VALID_DRAFT.props[0], name: "OnSelect" }],
      invalidCombinations: [{ OnSelect: "required", state: "disabled" }],
      examples: [{ name: "Default", props: { OnSelect: "handler" }, state: "default" }],
    };
    const client = fakeClient([draftWithBadPropName]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.props[0]!.name).toBe("onSelect");
    expect(spec.invalidCombinations).toEqual([{ onSelect: "required", state: "disabled" }]);
    expect(spec.examples[0]!.props).toEqual({ onSelect: "handler" });
    expect(client.complete).toHaveBeenCalledTimes(1);
  });

  it("coerces a kebab-case or snake_case prop name to camelCase", async () => {
    const client = fakeClient([
      { ...MINIMAL_VALID_DRAFT, props: [{ ...MINIMAL_VALID_DRAFT.props[0], name: "icon-position" }] },
    ]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.props[0]!.name).toBe("iconPosition");
  });

  it("coerces a non-camelCase anatomy part name to camelCase", async () => {
    const client = fakeClient([
      {
        ...MINIMAL_VALID_DRAFT,
        anatomy: { root: "div element", parts: [{ name: "IconContainer", description: "Wraps the icon.", optional: true }] },
      },
    ]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    expect(spec.anatomy.parts[0]!.name).toBe("iconContainer");
  });

  it("passes the real token vocabulary to the model so it can't only guess at plausible-sounding paths", async () => {
    const client = fakeClient([MINIMAL_VALID_DRAFT]);
    await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {}, SAMPLE_TOKEN_PATHS);
    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("{color.action.primary.default.bg}");
    expect(userMessage).toContain("{spacing.sm}");
    expect(userMessage).toContain("{fontSize.sm}");
  });
});

describe("suggestInterviewAnswer", () => {
  const QUESTION = {
    id: "intent",
    prompt: "When should DatePicker be used vs. a plain text date input?",
    why: "the PRD never contrasts it with alternatives",
  };
  const OTHER_QUESTION = { id: "edge_cases", prompt: "Are there invalid prop/state combinations?", why: "helps define invalidCombinations" };

  it("returns a validated suggested answer", async () => {
    const client = fakeClient([{ answer: "Use DatePicker whenever the range is bounded and known in advance." }]);
    const result = await suggestInterviewAnswer(client, "test/model", "DatePicker", "PRD context", QUESTION, [OTHER_QUESTION]);
    expect(SuggestedAnswerSchema.safeParse(result).success).toBe(true);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("includes the target question but not the other questions' text as something to answer", async () => {
    const client = fakeClient([{ answer: "A plausible draft answer." }]);
    await suggestInterviewAnswer(client, "test/model", "DatePicker", "PRD context", QUESTION, [OTHER_QUESTION]);
    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain(QUESTION.prompt);
    expect(userMessage).toContain(OTHER_QUESTION.prompt);
    expect(userMessage).toContain("context only");
  });
});
