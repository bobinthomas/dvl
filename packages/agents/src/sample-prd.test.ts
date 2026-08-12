import { describe, it, expect, vi } from "vitest";
import { generateSamplePrd, SamplePrdSchema } from "./sample-prd.js";
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

const VALID_PRD = { prdText: "# Sample PRD\n\n## Problem\n\nCustomers can't schedule a pickup window." };

describe("generateSamplePrd", () => {
  it("returns validated PRD text", async () => {
    const client = fakeClient([VALID_PRD]);
    const result = await generateSamplePrd(client, "test/model", "scheduling a pickup");
    expect(SamplePrdSchema.safeParse(result).success).toBe(true);
    expect(result.prdText.length).toBeGreaterThan(0);
  });

  it("still produces a valid call with no hint", async () => {
    const client = fakeClient([VALID_PRD]);
    await generateSamplePrd(client, "test/model");
    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).not.toContain("undefined");
    expect(userMessage.length).toBeGreaterThan(0);
  });

  it("retries once on invalid output, then succeeds", async () => {
    const client = fakeClient([{ prdText: "" }, VALID_PRD]);
    const result = await generateSamplePrd(client, "test/model");
    expect(result.prdText).toBe(VALID_PRD.prdText);
    expect(client.complete).toHaveBeenCalledTimes(2);
  });
});
