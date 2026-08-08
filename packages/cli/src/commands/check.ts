import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileTokensToCss, generateReact } from "@ds-platform/generator-react";
import { idsToBuild, loadValidSpec } from "./build.js";

export interface CheckOptions {
  cwd: string;
}

interface Mismatch {
  file: string;
  reason: string;
}

function compareFile(diskPath: string, expected: string, mismatches: Mismatch[]): void {
  if (!existsSync(diskPath)) {
    mismatches.push({ file: diskPath, reason: "missing on disk — run `ds build` to generate it" });
    return;
  }
  const actual = readFileSync(diskPath, "utf-8");
  if (actual !== expected) {
    mismatches.push({
      file: diskPath,
      reason:
        "on-disk content does not match what the spec generates — run `ds build` to resync, or if this was a hand edit, revert it",
    });
  }
}

/**
 * The sync gate: this is the whole thesis in executable form. Regenerates
 * everything into a scratch location without touching generated/, then
 * diffs byte-for-byte against what's actually committed. Any drift — a
 * hand edit, a spec change nobody rebuilt for — fails the check.
 */
export async function runCheck(id: string | undefined, options: CheckOptions): Promise<boolean> {
  const { cwd } = options;
  const ids = idsToBuild(cwd, id);
  if (ids.length === 0) {
    console.error(`no specs found under ${join(cwd, "components")}`);
    return false;
  }

  const reactDir = join(cwd, "generated", "react");
  const scratch = mkdtempSync(join(tmpdir(), "ds-check-"));
  const mismatches: Mismatch[] = [];
  let allSpecsValid = true;

  try {
    const expectedTokensCss = await compileTokensToCss(join(cwd, "tokens", "tokens.json"), scratch);
    compareFile(join(reactDir, "tokens.css"), expectedTokensCss, mismatches);

    for (const componentId of ids) {
      const spec = loadValidSpec(cwd, componentId);
      if (!spec) {
        allSpecsValid = false;
        continue;
      }
      for (const file of generateReact(spec)) {
        compareFile(join(reactDir, file.filePath), file.contents, mismatches);
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  for (const mismatch of mismatches) {
    console.error(`OUT OF SYNC  ${mismatch.file}`);
    console.error(`  ${mismatch.reason}`);
  }

  const ok = allSpecsValid && mismatches.length === 0;
  if (ok) {
    console.log(`IN SYNC  generated/react matches what \`ds build\` produces for [${ids.join(", ")}]`);
  }
  return ok;
}
