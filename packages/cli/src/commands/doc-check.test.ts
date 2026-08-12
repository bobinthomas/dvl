import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ModelClient } from "@ds-platform/agents";
import { runDocCheck } from "./doc-check.js";

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

describe("runDocCheck", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    Object.assign(process.env, FAKE_ENV);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports adequate for the real, schema-valid button spec", async () => {
    const client = fakeClient({ rating: "adequate", issues: [] });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const ok = await runDocCheck("button", { cwd: repoRoot }, client);

    expect(ok).toBe(true);
    expect(client.complete).toHaveBeenCalledTimes(1);
    const printed = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(printed).toContain("ADEQUATE");
    expect(printed).toContain("button");
    logSpy.mockRestore();
  });

  it("reports needs-improvement with issues, without failing the process", async () => {
    const client = fakeClient({
      rating: "needs-improvement",
      issues: ["keyboard behavior is generic boilerplate"],
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const ok = await runDocCheck("button", { cwd: repoRoot }, client);

    expect(ok).toBe(false);
    const printed = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(printed).toContain("NEEDS-IMPROVEMENT");
    expect(printed).toContain("keyboard behavior is generic boilerplate");
    logSpy.mockRestore();
  });

  it("fails cleanly when no spec is found for the given id, without calling the model", async () => {
    const client = fakeClient({ rating: "adequate", issues: [] });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ok = await runDocCheck("does-not-exist", { cwd: repoRoot }, client);

    expect(ok).toBe(false);
    expect(client.complete).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("fails cleanly when required gateway env vars are missing", async () => {
    delete process.env.DS_MODEL;
    const client = fakeClient({ rating: "adequate", issues: [] });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ok = await runDocCheck("button", { cwd: repoRoot }, client);

    expect(ok).toBe(false);
    expect(client.complete).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("DS_MODEL"));
    errorSpy.mockRestore();
  });
});
