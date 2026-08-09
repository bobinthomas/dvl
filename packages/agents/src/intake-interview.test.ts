import { describe, it, expect, vi } from "vitest";
import {
  generateInterviewQuestions,
  draftSpecFromAnswers,
  InterviewQuestionsSchema,
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
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {
      intent: "Used for scheduling flows with a bounded date range.",
    });
    expect(spec.status).toBe("draft");
  });

  it("produces a spec that conforms to the same schema hand-authored specs validate against", async () => {
    const client = fakeClient([MINIMAL_VALID_DRAFT]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {});
    expect(spec.id).toBe("date-picker");
    expect(spec.examples.length).toBeGreaterThan(0);
  });

  it("retries when the model's draft is missing a required field, then succeeds", async () => {
    const { description: _omit, ...missingDescription } = MINIMAL_VALID_DRAFT;
    const client = fakeClient([missingDescription, MINIMAL_VALID_DRAFT]);
    const spec = await draftSpecFromAnswers(client, "test/model", "DatePicker", "PRD context", {});
    expect(spec.status).toBe("draft");
    expect(client.complete).toHaveBeenCalledTimes(2);
  });
});
