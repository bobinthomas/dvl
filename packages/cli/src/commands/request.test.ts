import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ComponentRequestSchema } from "@ds-platform/core";
import type { FigmaClient, FigmaFileNode } from "@ds-platform/figma-client";
import {
  runRequestNew,
  runRequestApprove,
  runRequestBrief,
  runRequestSetFigmaFile,
  runRequestVerify,
  runRequestList,
} from "./request.js";

function fakeAsker(answers: string[]) {
  let call = 0;
  return vi.fn(async () => answers[Math.min(call++, answers.length - 1)]);
}

describe("request commands", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "ds-request-test-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  describe("runRequestNew", () => {
    it("writes a pending request from the answers", async () => {
      const ask = fakeAsker([
        "Customers need to pick a pickup day.",
        "forms",
        "must support a bounded date range",
        "single, range",
        "@pm-jamie",
      ]);

      const ok = await runRequestNew("date-picker", { cwd }, ask);

      expect(ok).toBe(true);
      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      expect(existsSync(requestPath)).toBe(true);

      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.status).toBe("pending");
      expect(written.id).toBe("date-picker");
      expect(written.name).toBe("DatePicker");
      expect(written.category).toBe("forms");
      expect(written.expectedVariants).toEqual(["single", "range"]);
      expect(written.requestedBy).toBe("@pm-jamie");
    });

    it("refuses a non-kebab-case name without prompting", async () => {
      const ask = fakeAsker([]);
      const ok = await runRequestNew("DatePicker", { cwd }, ask);
      expect(ok).toBe(false);
      expect(ask).not.toHaveBeenCalled();
    });

    it("refuses to overwrite an existing request", async () => {
      mkdirSync(join(cwd, "requests", "date-picker"), { recursive: true });
      writeFileSync(join(cwd, "requests", "date-picker", "request.json"), "{}", "utf-8");
      const ask = fakeAsker([]);

      const ok = await runRequestNew("date-picker", { cwd }, ask);

      expect(ok).toBe(false);
      expect(ask).not.toHaveBeenCalled();
    });

    it("rejects an invalid category with a validation error, not a crash", async () => {
      const ask = fakeAsker(["some problem", "not-a-real-category", "", "", "@pm-jamie"]);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const ok = await runRequestNew("date-picker", { cwd }, ask);

      expect(ok).toBe(false);
      expect(existsSync(join(cwd, "requests", "date-picker", "request.json"))).toBe(false);
      errorSpy.mockRestore();
    });
  });

  describe("runRequestApprove", () => {
    it("moves a pending request to approved", async () => {
      const ask = fakeAsker(["problem", "forms", "", "", "@pm-jamie"]);
      await runRequestNew("date-picker", { cwd }, ask);

      const ok = runRequestApprove("date-picker", { cwd });

      expect(ok).toBe(true);
      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.status).toBe("approved");
    });

    it("refuses to approve a request that isn't pending", async () => {
      const ask = fakeAsker(["problem", "forms", "", "", "@pm-jamie"]);
      await runRequestNew("date-picker", { cwd }, ask);
      runRequestApprove("date-picker", { cwd });

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const ok = runRequestApprove("date-picker", { cwd });

      expect(ok).toBe(false);
      errorSpy.mockRestore();
    });

    it("fails cleanly when no request exists for the id", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const ok = runRequestApprove("does-not-exist", { cwd });
      expect(ok).toBe(false);
      errorSpy.mockRestore();
    });
  });

  describe("runRequestBrief", () => {
    async function approvedRequest() {
      const ask = fakeAsker([
        "Customers need to pick a pickup day.",
        "forms",
        "must support a bounded date range",
        "single, range",
        "@pm-jamie",
      ]);
      await runRequestNew("date-picker", { cwd }, ask);
      runRequestApprove("date-picker", { cwd });
    }

    it("writes a brief and moves the request to in-design", async () => {
      await approvedRequest();

      const ok = runRequestBrief("date-picker", { cwd });

      expect(ok).toBe(true);
      const briefPath = join(cwd, "requests", "date-picker", "BRIEF.md");
      expect(existsSync(briefPath)).toBe(true);
      const brief = readFileSync(briefPath, "utf-8");
      expect(brief).toContain("# Design Brief: DatePicker");
      expect(brief).toContain("Customers need to pick a pickup day.");
      expect(brief).toContain("- single");
      expect(brief).toContain("- range");
      expect(brief).toContain("ds request verify date-picker");

      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.status).toBe("in-design");
    });

    it("refuses to brief a request that isn't approved", async () => {
      const ask = fakeAsker(["problem", "forms", "", "", "@pm-jamie"]);
      await runRequestNew("date-picker", { cwd }, ask); // still "pending"

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const ok = runRequestBrief("date-picker", { cwd });

      expect(ok).toBe(false);
      expect(existsSync(join(cwd, "requests", "date-picker", "BRIEF.md"))).toBe(false);
      errorSpy.mockRestore();
    });
  });

  describe("runRequestSetFigmaFile and runRequestVerify", () => {
    async function inDesignRequest() {
      const ask = fakeAsker([
        "Customers need to pick a pickup day.",
        "forms",
        "",
        "single, range",
        "@pm-jamie",
      ]);
      await runRequestNew("date-picker", { cwd }, ask);
      runRequestApprove("date-picker", { cwd });
      runRequestBrief("date-picker", { cwd });
    }

    function fakeFigmaClient(file: FigmaFileNode): FigmaClient {
      return {
        getFile: vi.fn(async () => file),
        getLocalVariables: vi.fn(async () => ({ meta: { variables: {}, variableCollections: {} } })),
      };
    }

    it("records the figma file key on the request", async () => {
      await inDesignRequest();

      const ok = runRequestSetFigmaFile("date-picker", "abc123", { cwd });

      expect(ok).toBe(true);
      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.figmaFileKey).toBe("abc123");
    });

    it("refuses to verify without a figmaFileKey set", async () => {
      await inDesignRequest();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const ok = await runRequestVerify("date-picker", { cwd }, fakeFigmaClient({ name: "f", document: { id: "0:0", name: "Document", type: "DOCUMENT" } }));

      expect(ok).toBe(false);
      errorSpy.mockRestore();
    });

    it("moves the request to ready-for-verification when the Figma file matches", async () => {
      await inDesignRequest();
      runRequestSetFigmaFile("date-picker", "abc123", { cwd });

      const file: FigmaFileNode = {
        name: "Design System",
        document: {
          id: "0:0",
          name: "Document",
          type: "DOCUMENT",
          children: [
            {
              id: "1:1",
              name: "DatePicker",
              type: "COMPONENT_SET",
              children: [
                { id: "1:2", name: "mode=single", type: "COMPONENT", boundVariables: { fills: [{}] } },
                { id: "1:3", name: "mode=range", type: "COMPONENT" },
              ],
            },
          ],
        },
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const ok = await runRequestVerify("date-picker", { cwd }, fakeFigmaClient(file));
      logSpy.mockRestore();

      expect(ok).toBe(true);
      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.status).toBe("ready-for-verification");
    });

    it("leaves the request in-design and reports issues when the Figma file doesn't match yet", async () => {
      await inDesignRequest();
      runRequestSetFigmaFile("date-picker", "abc123", { cwd });

      const file: FigmaFileNode = {
        name: "Design System",
        document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] },
      };
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const ok = await runRequestVerify("date-picker", { cwd }, fakeFigmaClient(file));
      const printed = logSpy.mock.calls.map((c) => c[0]).join("\n");
      logSpy.mockRestore();

      expect(ok).toBe(false);
      expect(printed).toContain('no component or component-set named "DatePicker"');
      const requestPath = join(cwd, "requests", "date-picker", "request.json");
      const written = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
      expect(written.status).toBe("in-design");
    });
  });

  describe("runRequestList", () => {
    it("prints nothing found when there are no requests", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const ok = runRequestList({ cwd });
      expect(ok).toBe(true);
      expect(logSpy.mock.calls.map((c) => c[0]).join("\n")).toContain("no component requests found");
      logSpy.mockRestore();
    });

    it("groups requests by status", async () => {
      const ask = fakeAsker(["problem", "forms", "", "", "@pm-jamie"]);
      await runRequestNew("date-picker", { cwd }, ask);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const ok = runRequestList({ cwd });
      const printed = logSpy.mock.calls.map((c) => c[0]).join("\n");
      logSpy.mockRestore();

      expect(ok).toBe(true);
      expect(printed).toContain("PENDING");
      expect(printed).toContain("date-picker");
    });
  });
});
