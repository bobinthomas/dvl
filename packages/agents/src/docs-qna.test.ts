import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { ComponentSpecSchema } from "@ds-platform/core";
import { answerDocsQuestion, DocsAnswerSchema } from "./docs-qna.js";
import type { ModelClient } from "./gateway-client.js";

const repoRoot = join(__dirname, "..", "..", "..");
const buttonSpec = ComponentSpecSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "components", "button", "spec.json"), "utf-8"))
);

function fakeClient(response: unknown): ModelClient {
  return { complete: vi.fn(async () => JSON.stringify(response)) };
}

describe("answerDocsQuestion", () => {
  it("returns a grounded answer for a question the spec bundle actually covers", async () => {
    const client = fakeClient({
      grounded: true,
      answer: "Button supports three variants: primary, secondary, and tertiary.",
      citedComponent: "button",
    });
    const result = await answerDocsQuestion(client, "test/model", [buttonSpec], "What variants does Button support?");

    expect(DocsAnswerSchema.safeParse(result).success).toBe(true);
    expect(result.grounded).toBe(true);
    expect(result.citedComponent).toBe("button");
  });

  it("refuses plainly when the question isn't covered by the spec bundle — demonstrated on purpose", async () => {
    const client = fakeClient({
      grounded: false,
      answer: "The spec bundle doesn't cover pricing — there's no spec here about cost or billing.",
    });
    const result = await answerDocsQuestion(client, "test/model", [buttonSpec], "How much does the enterprise plan cost?");

    expect(result.grounded).toBe(false);
    expect(result.answer.toLowerCase()).not.toMatch(/sorry|i apologize/);
    expect(result.citedComponent).toBeUndefined();
  });

  it("passes the real spec bundle contents to the model", async () => {
    const client = fakeClient({ grounded: true, answer: "...", citedComponent: "button" });
    await answerDocsQuestion(client, "test/model", [buttonSpec], "What is Button's accessibility role?");

    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain('"id": "button"');
  });

  it("tells the model the bundle is empty when no specs are passed", async () => {
    const client = fakeClient({ grounded: false, answer: "The spec bundle doesn't cover that." });
    await answerDocsQuestion(client, "test/model", [], "What does Button do?");

    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("spec bundle provided for this question is empty");
  });
});
