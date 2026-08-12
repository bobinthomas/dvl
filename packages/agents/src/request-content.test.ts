import { describe, it, expect, vi } from "vitest";
import { generateRequestContent, RequestContentDraftSchema } from "./request-content.js";
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

const VALID_DRAFT = {
  problem: "Customers can't filter results by more than one attribute at once.",
  notes: "Should compose with the existing FilterBar.",
  expectedVariants: ["single", "multi"],
};

describe("generateRequestContent", () => {
  it("returns validated request content", async () => {
    const client = fakeClient([VALID_DRAFT]);
    const result = await generateRequestContent(client, "test/model", {
      name: "filter-chip",
      category: "forms",
      hint: "filtering a product list",
    });
    expect(RequestContentDraftSchema.safeParse(result).success).toBe(true);
    expect(result.expectedVariants).toEqual(["single", "multi"]);
  });

  it("passes id, category, and hint into the outgoing message", async () => {
    const client = fakeClient([VALID_DRAFT]);
    await generateRequestContent(client, "test/model", {
      name: "filter-chip",
      category: "forms",
      hint: "filtering a product list",
    });
    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("filter-chip");
    expect(userMessage).toContain("forms");
    expect(userMessage).toContain("filtering a product list");
  });

  it("works with no hint and no name", async () => {
    const client = fakeClient([VALID_DRAFT]);
    const result = await generateRequestContent(client, "test/model", { category: "forms" });
    expect(RequestContentDraftSchema.safeParse(result).success).toBe(true);
  });

  it("retries when the model's first response is missing a required field, then succeeds", async () => {
    const { problem: _omit, ...missingProblem } = VALID_DRAFT;
    const client = fakeClient([missingProblem, VALID_DRAFT]);
    const result = await generateRequestContent(client, "test/model", { category: "forms" });
    expect(result.problem).toBe(VALID_DRAFT.problem);
    expect(client.complete).toHaveBeenCalledTimes(2);
  });
});
