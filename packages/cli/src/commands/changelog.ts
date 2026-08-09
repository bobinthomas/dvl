import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ComponentSpecSchema, specPathForId, type ComponentSpec } from "@ds-platform/core";
import { diffSpecs, deriveBump, bumpVersion, buildMigrationGuide, prependChangelogEntry } from "@ds-platform/governance";

export interface ChangelogOptions {
  cwd: string;
  /** Git ref to diff the working-tree spec against. Defaults to HEAD — "what would bumping look like if I committed my current changes". */
  base: string;
  /** Injectable so this is testable without a real git history. */
  today?: string;
}

function readSpecAtRef(cwd: string, id: string, ref: string): ComponentSpec | undefined {
  const relativePath = `components/${id}/spec.json`;
  let raw: string;
  try {
    raw = execFileSync("git", ["show", `${ref}:${relativePath}`], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"], // git's "not in <ref>" error is expected here and handled below — don't leak it
    });
  } catch {
    return undefined; // the spec didn't exist at that ref — nothing to diff against
  }
  return ComponentSpecSchema.parse(JSON.parse(raw));
}

function readWorkingTreeSpec(cwd: string, id: string): ComponentSpec {
  const specPath = specPathForId(join(cwd, "components"), id);
  return ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
}

/**
 * `ds changelog <id>` — the governance gate. Diffs the working-tree spec
 * against its version at `--base`, derives the version bump the diff
 * implies, and requires the spec's own declared `version` to match exactly.
 * On a match it writes the changelog (and a migration guide for a major
 * bump); on a mismatch it fails with the expected version, so "the version
 * I declared" and "the version the diff implies" can never silently drift —
 * same shape as the validator being a gate, not a linter.
 */
export function runChangelog(id: string, options: ChangelogOptions): boolean {
  const { cwd, base } = options;
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  const specPath = specPathForId(join(cwd, "components"), id);
  if (!existsSync(specPath)) {
    console.error(`no spec found at components/${id}/spec.json`);
    return false;
  }

  const after = readWorkingTreeSpec(cwd, id);
  const before = readSpecAtRef(cwd, id, base);

  if (!before) {
    console.log(`components/${id}/spec.json has no prior version at "${base}" — nothing to diff, no changelog needed yet.`);
    return true;
  }

  const changes = diffSpecs(before, after);
  const bump = deriveBump(changes);

  if (bump === "none") {
    console.log(`components/${id}: no governance-relevant changes since ${base} (version unchanged at ${after.version}).`);
    return true;
  }

  const expectedVersion = bumpVersion(before.version, bump);
  if (after.version !== expectedVersion) {
    console.error(
      `components/${id}/spec.json declares version "${after.version}", but the diff against ${base} (${before.version}) implies a ${bump} bump — expected "${expectedVersion}".`
    );
    console.error(`Changes found:`);
    for (const c of changes) console.error(`  [${c.level}] ${c.description}`);
    return false;
  }

  const entry = { version: after.version, previousVersion: before.version, date: today, bump, changes };
  const changelogPath = join(cwd, "components", id, "CHANGELOG.md");
  const existingChangelog = existsSync(changelogPath) ? readFileSync(changelogPath, "utf-8") : "";
  writeFileSync(changelogPath, prependChangelogEntry(existingChangelog, entry), "utf-8");
  console.log(`WROTE components/${id}/CHANGELOG.md (${bump}: ${before.version} -> ${after.version})`);

  const migrationGuide = buildMigrationGuide(entry);
  if (migrationGuide) {
    const migrationPath = join(cwd, "components", id, "MIGRATION.md");
    writeFileSync(migrationPath, migrationGuide, "utf-8");
    console.log(`WROTE components/${id}/MIGRATION.md`);
  }

  return true;
}
