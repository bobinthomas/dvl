import { describe, it, expect } from "vitest";
import { buildChangelogEntry, prependChangelogEntry, buildMigrationGuide, type ChangelogEntry } from "./changelog.js";

const MINOR_ENTRY: ChangelogEntry = {
  version: "1.1.0",
  previousVersion: "1.0.0",
  date: "2026-08-09",
  bump: "minor",
  changes: [
    { level: "minor", description: 'added prop "icon"' },
    { level: "patch", description: 'updated description for prop "variant"' },
  ],
};

const MAJOR_ENTRY: ChangelogEntry = {
  version: "2.0.0",
  previousVersion: "1.1.0",
  date: "2026-08-10",
  bump: "major",
  changes: [
    { level: "major", description: 'removed prop "onPress"' },
    { level: "minor", description: 'added prop "onActivate"' },
  ],
};

describe("buildChangelogEntry", () => {
  it("groups changes under Added/Changed headings, omitting empty groups", () => {
    const md = buildChangelogEntry(MINOR_ENTRY);
    expect(md).toContain("## 1.1.0 — 2026-08-09");
    expect(md).toContain("### Added");
    expect(md).toContain('- added prop "icon"');
    expect(md).toContain("### Changed");
    expect(md).toContain('- updated description for prop "variant"');
    expect(md).not.toContain("### Breaking");
  });

  it("includes a Breaking section for major changes", () => {
    const md = buildChangelogEntry(MAJOR_ENTRY);
    expect(md).toContain("### Breaking");
    expect(md).toContain('- removed prop "onPress"');
    expect(md).toContain("### Added");
  });
});

describe("prependChangelogEntry", () => {
  it("creates a fresh changelog with a heading when none exists yet", () => {
    const result = prependChangelogEntry("", MINOR_ENTRY);
    expect(result.startsWith("# Changelog\n\n")).toBe(true);
    expect(result).toContain("## 1.1.0");
  });

  it("prepends a new entry above existing entries, newest first", () => {
    const existing = "# Changelog\n\n## 1.0.0 — 2026-07-01\n\n### Added\n\n- initial release\n";
    const result = prependChangelogEntry(existing, MINOR_ENTRY);
    const firstEntryIndex = result.indexOf("## 1.1.0");
    const secondEntryIndex = result.indexOf("## 1.0.0");
    expect(firstEntryIndex).toBeGreaterThan(-1);
    expect(secondEntryIndex).toBeGreaterThan(firstEntryIndex);
  });
});

describe("buildMigrationGuide", () => {
  it("returns undefined when there are no breaking changes", () => {
    expect(buildMigrationGuide(MINOR_ENTRY)).toBeUndefined();
  });

  it("lists every breaking change with a from/to heading for a major bump", () => {
    const guide = buildMigrationGuide(MAJOR_ENTRY);
    expect(guide).toBeDefined();
    expect(guide).toContain("Migrating from 1.1.0 to 2.0.0");
    expect(guide).toContain('- removed prop "onPress"');
    expect(guide).not.toContain('added prop "onActivate"');
  });
});
