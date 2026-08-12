import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { callModel, ModelOutputError } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

const schema = z.object({ greeting: z.string() });

function fakeClient(responses: string[]): ModelClient {
  let call = 0;
  return {
    complete: vi.fn(async () => {
      const response = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return response;
    }),
  };
}

describe("callModel", () => {
  it("returns the parsed, validated result on a valid first response", async () => {
    const client = fakeClient([JSON.stringify({ greeting: "hi" })]);
    const result = await callModel(client, "test/model", {
      schema,
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result).toEqual({ greeting: "hi" });
    expect(client.complete).toHaveBeenCalledTimes(1);
  });

  it("strips a ```json ... ``` code fence some models wrap responses in, without needing a retry", async () => {
    const client = fakeClient(["```json\n" + JSON.stringify({ greeting: "hi" }) + "\n```"]);
    const result = await callModel(client, "test/model", {
      schema,
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result).toEqual({ greeting: "hi" });
    expect(client.complete).toHaveBeenCalledTimes(1);
  });

  it("strips a bare ``` fence with no language tag", async () => {
    const client = fakeClient(["```\n" + JSON.stringify({ greeting: "hi" }) + "\n```"]);
    const result = await callModel(client, "test/model", {
      schema,
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result).toEqual({ greeting: "hi" });
    expect(client.complete).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed JSON and succeeds on the second attempt", async () => {
    const client = fakeClient(["not json at all", JSON.stringify({ greeting: "hi" })]);
    const result = await callModel(client, "test/model", {
      schema,
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result).toEqual({ greeting: "hi" });
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it("retries once on schema-invalid JSON and succeeds on the second attempt", async () => {
    const client = fakeClient([
      JSON.stringify({ greeting: 42 }),
      JSON.stringify({ greeting: "hi" }),
    ]);
    const result = await callModel(client, "test/model", {
      schema,
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(result).toEqual({ greeting: "hi" });
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it("throws a typed ModelOutputError after exhausting retries on persistently bad output", async () => {
    const client = fakeClient(["still not json", "still not json"]);
    await expect(
      callModel(client, "test/model", {
        schema,
        schemaName: "greeting",
        system: "sys",
        messages: [{ role: "user", content: "hello" }],
      })
    ).rejects.toThrow(ModelOutputError);
    expect(client.complete).toHaveBeenCalledTimes(2);
  });

  it("tells the model what was wrong with its first attempt on retry", async () => {
    const client = fakeClient([JSON.stringify({ greeting: 42 }), JSON.stringify({ greeting: "hi" })]);
    await callModel(client, "test/model", {
      schema,
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
    });
    const secondCallArgs = (client.complete as ReturnType<typeof vi.fn>).mock.calls[1][0];
    const lastMessage = secondCallArgs.messages.at(-1);
    expect(lastMessage.content).toContain("greeting");
  });

  it("applies normalize() before validation on every attempt", async () => {
    const client = fakeClient([JSON.stringify({ greeting: "hi", status: "stable" })]);
    const result = await callModel(client, "test/model", {
      schema: z.object({ greeting: z.string(), status: z.string() }),
      schemaName: "greeting",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
      normalize: (raw) => ({ ...(raw as object), status: "draft" }),
    });
    expect(result).toEqual({ greeting: "hi", status: "draft" });
  });
});
