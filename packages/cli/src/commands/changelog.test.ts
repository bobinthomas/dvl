import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runChangelog } from "./changelog.js";

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

function writeSpec(cwd: string, spec: unknown): void {
  mkdirSync(join(cwd, "components", "widget"), { recursive: true });
  writeFileSync(join(cwd, "components", "widget", "spec.json"), JSON.stringify(spec, null, 2), "utf-8");
}

const V1 = {
  id: "widget",
  name: "Widget",
  category: "actions",
  status: "stable",
  version: "1.0.0",
  owner: "@ds-lead",
  description: "A test widget.",
  anatomy: { root: "div element", parts: [] },
  props: [
    { name: "onPress", type: "function", required: true, platforms: ["react", "react-native"], description: "Fires on activation." },
  ],
  states: ["default"],
  invalidCombinations: [],
  tokens: [],
  accessibility: { role: "button", keyboard: {}, aria: [], contrast: [], requirements: ["Minimum touch target 44x44dp."] },
  examples: [{ name: "Default", props: {}, state: "default" }],
  overrides: { imports: [] },
};

describe("runChangelog", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "ds-changelog-test-"));
    git(cwd, "init", "-q");
    git(cwd, "config", "user.email", "test@example.com");
    git(cwd, "config", "user.name", "Test");
    writeSpec(cwd, V1);
    git(cwd, "add", ".");
    git(cwd, "commit", "-q", "-m", "v1.0.0");
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("passes and writes a changelog when the declared version matches the derived bump", () => {
    writeSpec(cwd, {
      ...V1,
      version: "1.1.0",
      props: [...V1.props, { name: "icon", type: "node", required: false, platforms: ["react", "react-native"], description: "Optional icon." }],
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const ok = runChangelog("widget", { cwd, base: "HEAD", today: "2026-08-09" });
    logSpy.mockRestore();

    expect(ok).toBe(true);
    const changelogPath = join(cwd, "components", "widget", "CHANGELOG.md");
    expect(existsSync(changelogPath)).toBe(true);
    const changelog = readFileSync(changelogPath, "utf-8");
    expect(changelog).toContain("## 1.1.0 — 2026-08-09");
    expect(changelog).toContain('added prop "icon"');
    expect(existsSync(join(cwd, "components", "widget", "MIGRATION.md"))).toBe(false);
  });

  it("fails when the declared version doesn't match what the diff implies", () => {
    writeSpec(cwd, {
      ...V1,
      version: "1.0.1", // a prop was added — should be 1.1.0, not a patch bump
      props: [...V1.props, { name: "icon", type: "node", required: false, platforms: ["react", "react-native"], description: "Optional icon." }],
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = runChangelog("widget", { cwd, base: "HEAD", today: "2026-08-09" });

    expect(ok).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('expected "1.1.0"'));
    expect(existsSync(join(cwd, "components", "widget", "CHANGELOG.md"))).toBe(false);
    errorSpy.mockRestore();
  });

  it("writes a migration guide alongside the changelog for a major bump", () => {
    writeSpec(cwd, {
      ...V1,
      version: "2.0.0",
      props: [],
    });

    vi.spyOn(console, "log").mockImplementation(() => {});
    const ok = runChangelog("widget", { cwd, base: "HEAD", today: "2026-08-09" });
    vi.restoreAllMocks();

    expect(ok).toBe(true);
    const migrationPath = join(cwd, "components", "widget", "MIGRATION.md");
    expect(existsSync(migrationPath)).toBe(true);
    expect(readFileSync(migrationPath, "utf-8")).toContain("Migrating from 1.0.0 to 2.0.0");
  });

  it("passes without writing anything when there's no governance-relevant change", () => {
    writeSpec(cwd, { ...V1, owner: "@someone-else" }); // owner isn't diffed

    vi.spyOn(console, "log").mockImplementation(() => {});
    const ok = runChangelog("widget", { cwd, base: "HEAD", today: "2026-08-09" });
    vi.restoreAllMocks();

    expect(ok).toBe(true);
    expect(existsSync(join(cwd, "components", "widget", "CHANGELOG.md"))).toBe(false);
  });

  it("passes when the component has no prior version at the base ref", () => {
    rmSync(join(cwd, "components", "widget"), { recursive: true, force: true });
    git(cwd, "add", "-A");
    git(cwd, "commit", "-q", "-m", "remove widget");
    writeSpec(cwd, V1); // reintroduce it in the working tree, uncommitted

    vi.spyOn(console, "log").mockImplementation(() => {});
    const ok = runChangelog("widget", { cwd, base: "HEAD", today: "2026-08-09" });
    vi.restoreAllMocks();

    expect(ok).toBe(true);
  });
});
