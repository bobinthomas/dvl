import type { BumpLevel, SpecChange } from "./diff.js";

export interface ChangelogEntry {
  version: string;
  previousVersion: string;
  /** ISO date (YYYY-MM-DD). Passed in rather than read from Date.now() so this stays pure and testable. */
  date: string;
  bump: BumpLevel;
  changes: SpecChange[];
}

const CHANGELOG_HEADING = "# Changelog\n\n";

function groupByLevel(changes: SpecChange[]) {
  return {
    major: changes.filter((c) => c.level === "major"),
    minor: changes.filter((c) => c.level === "minor"),
    patch: changes.filter((c) => c.level === "patch"),
  };
}

/** One changelog entry, Keep a Changelog style, grouped by what the bump level means: breaking, added, changed. */
export function buildChangelogEntry(entry: ChangelogEntry): string {
  const { major, minor, patch } = groupByLevel(entry.changes);
  const lines: string[] = [`## ${entry.version} — ${entry.date}`, ""];

  if (major.length > 0) {
    lines.push("### Breaking", "");
    for (const c of major) lines.push(`- ${c.description}`);
    lines.push("");
  }
  if (minor.length > 0) {
    lines.push("### Added", "");
    for (const c of minor) lines.push(`- ${c.description}`);
    lines.push("");
  }
  if (patch.length > 0) {
    lines.push("### Changed", "");
    for (const c of patch) lines.push(`- ${c.description}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Newest-first, Keep a Changelog convention. `existing` is the current CHANGELOG.md content, or "" if none yet. */
export function prependChangelogEntry(existing: string, entry: ChangelogEntry): string {
  const body = buildChangelogEntry(entry);
  if (existing.trim().length === 0) return CHANGELOG_HEADING + body;

  const rest = existing.startsWith(CHANGELOG_HEADING) ? existing.slice(CHANGELOG_HEADING.length) : existing;
  return CHANGELOG_HEADING + body + "\n" + rest;
}

/**
 * Only meaningful for a major bump — undefined otherwise, so callers know
 * not to write a migration file for a minor/patch release. Every bullet is
 * the mechanical fact of what changed; it doesn't guess at the fix (no
 * model call here, this is deterministic governance code), so it names
 * exactly what a human needs to go find and update.
 */
export function buildMigrationGuide(entry: ChangelogEntry): string | undefined {
  const breaking = entry.changes.filter((c) => c.level === "major");
  if (breaking.length === 0) return undefined;

  const lines = [
    `# Migrating from ${entry.previousVersion} to ${entry.version}`,
    "",
    "This is a major version bump. The following changes are breaking — find and update call sites affected by each:",
    "",
    ...breaking.map((c) => `- ${c.description}`),
    "",
  ];
  return lines.join("\n");
}
