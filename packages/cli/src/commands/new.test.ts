import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ComponentSpecSchema, ComponentRequestSchema, type ComponentSpec, type ComponentRequest } from "@ds-platform/core";
import type { ModelClient } from "@ds-platform/agents";
import { runNew } from "./new.js";

const FAKE_ENV = {
  CF_AI_GATEWAY_ACCOUNT_ID: "test-account",
  CF_AI_GATEWAY_ID: "test-gateway",
  CF_AI_GATEWAY_TOKEN: "test-token",
  DS_MODEL: "test/model",
};

const DRAFT_SPEC = {
  id: "date-picker",
  name: "DatePicker",
  category: "forms",
  status: "stable", // ds new must force this to draft regardless
  version: "0.1.0",
  owner: "@ds-lead",
  description: "Lets a customer pick a pickup day from the next 7 available days.",
  anatomy: { root: "div element", parts: [] },
  props: [
    {
      name: "onSelect",
      type: "function",
      description: "Called with the selected date.",
      required: true,
      platforms: ["react", "react-native"],
    },
  ],
  states: ["default"],
  invalidCombinations: [],
  tokens: [],
  accessibility: { role: "grid", keyboard: {}, aria: [], contrast: [], requirements: [] },
  examples: [{ name: "Default", props: {}, state: "default" }],
  overrides: { imports: [] },
};

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

describe("runNew", () => {
  const originalEnv = { ...process.env };
  let cwd: string;

  beforeEach(() => {
    Object.assign(process.env, FAKE_ENV);
    cwd = mkdtempSync(join(tmpdir(), "ds-new-test-"));
    mkdirSync(join(cwd, "components"), { recursive: true });
    mkdirSync(join(cwd, "tokens"), { recursive: true });
    writeFileSync(
      join(cwd, "tokens", "tokens.json"),
      JSON.stringify({ color: { action: { primary: { bg: { $value: "#0052CC", $type: "color" } } } } }),
      "utf-8"
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(cwd, { recursive: true, force: true });
  });

  it("interviews, drafts, and writes a spec forced to status draft", async () => {
    const client = fakeClient([
      { questions: [{ id: "intent", prompt: "When should this be used?", why: "the PRD doesn't say" }] },
      DRAFT_SPEC,
    ]);
    const ask = vi.fn(async () => "Used for scheduling flows with a bounded date range.");

    const ok = await runNew("date-picker", { cwd }, ask, client);

    expect(ok).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
    const specPath = join(cwd, "components", "date-picker", "spec.json");
    expect(existsSync(specPath)).toBe(true);

    const written: ComponentSpec = ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
    expect(written.status).toBe("draft");
    expect(written.id).toBe("date-picker");

    const draftPrompt = (client.complete as ReturnType<typeof vi.fn>).mock.calls[1][0].messages
      .find((m: { role: string }) => m.role === "user").content;
    expect(draftPrompt).toContain("{color.action.primary.bg}");
  });

  it("refuses a non-kebab-case name without calling the model", async () => {
    const client = fakeClient([{ questions: [] }]);
    const ok = await runNew("DatePicker", { cwd }, async () => "", client);
    expect(ok).toBe(false);
    expect(client.complete).not.toHaveBeenCalled();
  });

  it("refuses to overwrite an existing spec", async () => {
    mkdirSync(join(cwd, "components", "date-picker"), { recursive: true });
    writeFileSync(join(cwd, "components", "date-picker", "spec.json"), "{}", "utf-8");
    const client = fakeClient([{ questions: [] }]);

    const ok = await runNew("date-picker", { cwd }, async () => "", client);

    expect(ok).toBe(false);
    expect(client.complete).not.toHaveBeenCalled();
  });

  describe("--from-request promotion", () => {
    function writeRequest(overrides: Partial<ComponentRequest> = {}): void {
      const request: ComponentRequest = {
        id: "date-picker",
        name: "DatePicker",
        category: "forms",
        problem: "Customers need to pick a pickup day.",
        expectedVariants: ["single", "range"],
        status: "ready-for-verification",
        requestedBy: "@pm-jamie",
        requestedAt: "2026-08-01T00:00:00.000Z",
        figmaFileKey: "abc123",
        ...overrides,
      };
      mkdirSync(join(cwd, "requests", "date-picker"), { recursive: true });
      writeFileSync(join(cwd, "requests", "date-picker", "request.json"), JSON.stringify(request, null, 2), "utf-8");
    }

    it("promotes a ready-for-verification request into a draft spec and marks it promoted", async () => {
      writeRequest();
      const client = fakeClient([
        { questions: [{ id: "intent", prompt: "When should this be used?", why: "the request doesn't say" }] },
        DRAFT_SPEC,
      ]);
      const ask = vi.fn(async () => "Used for scheduling flows with a bounded date range.");

      const ok = await runNew("date-picker", { cwd, fromRequest: "date-picker" }, ask, client);

      expect(ok).toBe(true);
      const specPath = join(cwd, "components", "date-picker", "spec.json");
      expect(existsSync(specPath)).toBe(true);

      const promptSent = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0].messages
        .find((m: { role: string }) => m.role === "user").content;
      expect(promptSent).toContain("Customers need to pick a pickup day.");
      expect(promptSent).toContain("single, range");

      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.status).toBe("promoted");
      expect(written.promotedSpecId).toBe("date-picker");
    });

    it("refuses to promote a request that isn't ready-for-verification", async () => {
      writeRequest({ status: "in-design" });
      const client = fakeClient([{ questions: [] }]);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const ok = await runNew("date-picker", { cwd, fromRequest: "date-picker" }, async () => "", client);

      expect(ok).toBe(false);
      expect(client.complete).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("refuses when the component name doesn't match the request id", async () => {
      writeRequest();
      const client = fakeClient([{ questions: [] }]);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const ok = await runNew("other-name", { cwd, fromRequest: "date-picker" }, async () => "", client);

      expect(ok).toBe(false);
      expect(client.complete).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("fails cleanly when the request doesn't exist", async () => {
      const client = fakeClient([{ questions: [] }]);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const ok = await runNew("date-picker", { cwd, fromRequest: "does-not-exist" }, async () => "", client);

      expect(ok).toBe(false);
      expect(client.complete).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
