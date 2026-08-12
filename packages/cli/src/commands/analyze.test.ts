import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ModelClient } from "@ds-platform/agents";
import { runAnalyze } from "./analyze.js";

const repoRoot = join(__dirname, "..", "..", "..", "..");

const FAKE_ENV = {
  CF_AI_GATEWAY_ACCOUNT_ID: "test-account",
  CF_AI_GATEWAY_ID: "test-gateway",
  CF_AI_GATEWAY_TOKEN: "test-token",
  DS_MODEL: "test/model",
};

function fakeClient(response: unknown): ModelClient {
  return { complete: vi.fn(async () => JSON.stringify(response)) };
}

describe("runAnalyze", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    Object.assign(process.env, FAKE_ENV);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reads the real PRD and components/ inventory, and prints a formatted report", async () => {
    const client = fakeClient({
      components: [
        { id: "button", name: "Button", classification: "partial", evidence: "...", missing: ["a destructive variant"] },
        { id: "date-picker", name: "DatePicker", classification: "missing", evidence: "...", missing: [] },
      ],
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const ok = await runAnalyze("demo/PRD-returns-pickup-scheduling.md", { cwd: repoRoot }, client);

    expect(ok).toBe(true);
    expect(client.complete).toHaveBeenCalledTimes(1);
    const printed = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(printed).toContain("PARTIAL");
    expect(printed).toContain("date-picker");
    logSpy.mockRestore();
  });

  it("with --check-docs, also runs the doc quality check on every 'have' component", async () => {
    let call = 0;
    const responses = [
      {
        components: [
          { id: "button", name: "Button", classification: "have", evidence: "...", missing: [] },
          { id: "date-picker", name: "DatePicker", classification: "missing", evidence: "...", missing: [] },
        ],
      },
      { rating: "needs-improvement", issues: ["keyboard behavior is generic boilerplate"] },
    ];
    const client: ModelClient = {
      complete: vi.fn(async () => JSON.stringify(responses[Math.min(call++, responses.length - 1)])),
    };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const ok = await runAnalyze(
      "demo/PRD-returns-pickup-scheduling.md",
      { cwd: repoRoot, checkDocs: true },
      client
    );

    expect(ok).toBe(false); // needs-improvement should surface as a non-adequate result
    expect(client.complete).toHaveBeenCalledTimes(2); // gap analysis, then doc check for "button" only
    const printed = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(printed).toContain("NEEDS-IMPROVEMENT");
    expect(printed).toContain("keyboard behavior is generic boilerplate");
    logSpy.mockRestore();
  });

  it("fails cleanly when the PRD file doesn't exist, without calling the model", async () => {
    const client = fakeClient({ components: [] });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ok = await runAnalyze("demo/does-not-exist.md", { cwd: repoRoot }, client);

    expect(ok).toBe(false);
    expect(client.complete).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("fails cleanly when required gateway env vars are missing", async () => {
    delete process.env.DS_MODEL;
    const client = fakeClient({ components: [] });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ok = await runAnalyze("demo/PRD-returns-pickup-scheduling.md", { cwd: repoRoot }, client);

    expect(ok).toBe(false);
    expect(client.complete).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("DS_MODEL"));
    errorSpy.mockRestore();
  });
});
