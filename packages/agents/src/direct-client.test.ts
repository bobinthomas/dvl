import { describe, it, expect } from "vitest";
import { withSchemaInstruction, DIRECT_PROVIDER_INFO } from "./direct-client.js";
import type { ChatMessage } from "./gateway-client.js";

describe("withSchemaInstruction", () => {
  it("appends the schema as a new message and leaves existing messages untouched", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "draft a spec for DatePicker" }];
    const schema = { type: "object", properties: { id: { type: "string" } } };

    const result = withSchemaInstruction(messages, "component_spec", schema);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(messages[0]);
    expect(result[1]!.role).toBe("user");
    expect(result[1]!.content).toContain("component_spec");
    expect(result[1]!.content).toContain(JSON.stringify(schema));
    expect(result[1]!.content.toLowerCase()).toContain("json");
  });

  it("does not mutate the input array", () => {
    const messages: ChatMessage[] = [{ role: "system", content: "system prompt" }];
    withSchemaInstruction(messages, "x", {});
    expect(messages).toHaveLength(1);
  });
});

describe("DIRECT_PROVIDER_INFO", () => {
  it("declares exactly groq, openrouter, and kimi with their OpenAI-compatible base URLs", () => {
    expect(Object.keys(DIRECT_PROVIDER_INFO).sort()).toEqual(["groq", "kimi", "openrouter"]);
    expect(DIRECT_PROVIDER_INFO.groq.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(DIRECT_PROVIDER_INFO.openrouter.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(DIRECT_PROVIDER_INFO.kimi.baseUrl).toBe("https://api.moonshot.ai/v1");
    for (const info of Object.values(DIRECT_PROVIDER_INFO)) {
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.modelPlaceholder.length).toBeGreaterThan(0);
    }
  });
});
