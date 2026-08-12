import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ComponentSpecSchema, findSpecFiles, type ComponentSpec } from "@ds-platform/core";
import {
  createGatewayClient,
  loadGatewayEnv,
  runGapAnalysis,
  runDocQualityCheck,
  ModelOutputError,
  type GapReport,
  type ModelClient,
} from "@ds-platform/agents";
import { formatQuality } from "./doc-check.js";

export interface AnalyzeOptions {
  cwd: string;
  checkDocs?: boolean;
}

function loadAllSpecs(cwd: string): ComponentSpec[] {
  return findSpecFiles(join(cwd, "components")).map((specPath) =>
    ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")))
  );
}

function formatReport(report: GapReport): string {
  const lines: string[] = [];
  for (const c of report.components) {
    lines.push(`${c.classification.toUpperCase().padEnd(7)} ${c.id}  (${c.name})`);
    lines.push(`  evidence: ${c.evidence}`);
    if (c.classification === "partial") {
      for (const m of c.missing) lines.push(`  missing:  ${m}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * `ds analyze <prd-path>` — gap analysis against the real components/
 * inventory. `client` is injectable (tests pass a fake; a real run leaves
 * it undefined and gets the real gateway) so this command is testable
 * without a live Cloudflare AI Gateway credential.
 */
export async function runAnalyze(
  prdPath: string,
  options: AnalyzeOptions,
  client?: ModelClient
): Promise<boolean> {
  const { cwd } = options;
  const absolutePrdPath = join(cwd, prdPath);

  let prdText: string;
  try {
    prdText = readFileSync(absolutePrdPath, "utf-8");
  } catch {
    console.error(`cannot read PRD file at ${absolutePrdPath}`);
    return false;
  }

  const specs = loadAllSpecs(cwd);

  let env;
  try {
    env = loadGatewayEnv();
  } catch (err) {
    console.error((err as Error).message);
    return false;
  }

  const modelClient = client ?? createGatewayClient(env);

  try {
    const report = await runGapAnalysis(modelClient, env.model, prdText, specs);
    console.log(formatReport(report));

    if (!options.checkDocs) return true;

    let allAdequate = true;
    for (const c of report.components) {
      if (c.classification !== "have") continue;
      const spec = specs.find((s) => s.id === c.id);
      if (!spec) continue;

      const quality = await runDocQualityCheck(modelClient, env.model, spec);
      console.log(formatQuality(spec.id, spec.name, quality));
      if (quality.rating !== "adequate") allAdequate = false;
    }
    return allAdequate;
  } catch (err) {
    if (err instanceof ModelOutputError) {
      console.error(`analysis failed: ${err.message}`);
      return false;
    }
    throw err;
  }
}
