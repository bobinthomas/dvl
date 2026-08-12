import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { ComponentSpecSchema } from "@ds-platform/core";
import { runDocQualityCheck, DocQualitySchema } from "./doc-quality-check.js";
import type { ModelClient } from "./gateway-client.js";

const repoRoot = join(__dirname, "..", "..", "..");
const buttonSpec = ComponentSpecSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "components", "button", "spec.json"), "utf-8"))
);

function fakeClient(response: unknown): ModelClient {
  return { complete: vi.fn(async () => JSON.stringify(response)) };
}

describe("runDocQualityCheck", () => {
  it("returns a validated adequate rating", async () => {
    const client = fakeClient({ rating: "adequate", issues: [] });
    const result = await runDocQualityCheck(client, "test/model", buttonSpec);

    expect(DocQualitySchema.safeParse(result).success).toBe(true);
    expect(result.rating).toBe("adequate");
    expect(result.issues).toEqual([]);
  });

  it("returns a validated needs-improvement rating with issues", async () => {
    const client = fakeClient({
      rating: "needs-improvement",
      issues: ['the "loading" state example is not meaningfully distinct from "default"'],
    });
    const result = await runDocQualityCheck(client, "test/model", buttonSpec);

    expect(result.rating).toBe("needs-improvement");
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("sends the real spec's description, props, and accessibility content to the model", async () => {
    const client = fakeClient({ rating: "adequate", issues: [] });
    await runDocQualityCheck(client, "test/model", buttonSpec);

    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain(buttonSpec.description);
    expect(userMessage).toContain("accessibility role:");
    for (const requirement of buttonSpec.accessibility.requirements) {
      expect(userMessage).toContain(requirement);
    }
  });
});
