import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { ComponentSpecSchema } from "@ds-platform/core";
import { runGapAnalysis, GapReportSchema } from "./gap-analysis.js";
import type { ModelClient } from "./gateway-client.js";

const repoRoot = join(__dirname, "..", "..", "..");
const buttonSpec = ComponentSpecSchema.parse(
  JSON.parse(readFileSync(join(repoRoot, "components", "button", "spec.json"), "utf-8"))
);
const prdText = readFileSync(join(repoRoot, "demo", "PRD-returns-pickup-scheduling.md"), "utf-8");

/**
 * There's no live gateway credential in this environment (see the Phase 5
 * plan), so this fixture is the well-reasoned classification a real model
 * should reach reading demo/PRD-returns-pickup-scheduling.md against the
 * current components/ inventory — not something asserted against a live
 * call. It exercises the full runGapAnalysis pipeline (prompt construction,
 * schema validation) against real inputs; only the model's own judgment is
 * stubbed.
 */
const EXPECTED_CLASSIFICATION = {
  components: [
    {
      id: "button",
      name: "Button",
      classification: "partial" as const,
      evidence: '"a primary call-to-action button" / "a secondary \'Change slot\' button" / "a destructive \'Cancel pickup\' action"',
      missing: ["a destructive/danger variant — the existing spec only declares primary, secondary, tertiary"],
    },
    {
      id: "date-picker",
      name: "DatePicker",
      classification: "missing" as const,
      evidence: '"A calendar opens showing the next 7 available days... available time slots for that day are shown as a list of selectable chips"',
      missing: [],
    },
    {
      id: "status-badge",
      name: "StatusBadge",
      classification: "missing" as const,
      evidence: '"a status indicator — Scheduled, Courier Assigned, Picked Up, or Cancelled... must be readable at a glance"',
      missing: [],
    },
    {
      id: "summary-card",
      name: "SummaryCard",
      classification: "missing" as const,
      evidence: '"pickup address in a card-style summary... appears in three other flows already"',
      missing: [],
    },
  ],
};

function fakeClient(response: unknown): ModelClient {
  return { complete: vi.fn(async () => JSON.stringify(response)) };
}

describe("runGapAnalysis", () => {
  it("returns a validated report classifying the components the demo PRD implies", async () => {
    const client = fakeClient(EXPECTED_CLASSIFICATION);
    const report = await runGapAnalysis(client, "test/model", prdText, [buttonSpec]);

    expect(GapReportSchema.safeParse(report).success).toBe(true);
    expect(report.components).toHaveLength(4);

    const button = report.components.find((c) => c.id === "button")!;
    expect(button.classification).toBe("partial");
    expect(button.missing.length).toBeGreaterThan(0);

    const missingIds = report.components.filter((c) => c.classification === "missing").map((c) => c.id);
    expect(missingIds).toEqual(["date-picker", "status-badge", "summary-card"]);
  });

  it("sends the real PRD text and the real existing-spec inventory to the model", async () => {
    const client = fakeClient(EXPECTED_CLASSIFICATION);
    await runGapAnalysis(client, "test/model", prdText, [buttonSpec]);

    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("Schedule Pickup");
    expect(userMessage).toContain("id: button");
  });

  it("tells the model the inventory is empty when there are no existing specs", async () => {
    const client = fakeClient({ components: [] });
    await runGapAnalysis(client, "test/model", prdText, []);

    const args = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = args.messages.find((m: { role: string }) => m.role === "user").content;
    expect(userMessage).toContain("inventory is currently empty");
  });
});
