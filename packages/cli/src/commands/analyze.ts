import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ComponentSpecSchema, findSpecFiles, type ComponentSpec } from "@ds-platform/core";
import {
  createGatewayClient,
  loadGatewayEnv,
  runGapAnalysis,
  ModelOutputError,
  type GapReport,
  type ModelClient,
} from "@ds-platform/agents";

export interface AnalyzeOptions {
  cwd: string;
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
    return true;
  } catch (err) {
    if (err instanceof ModelOutputError) {
      console.error(`gap analysis failed: ${err.message}`);
      return false;
    }
    throw err;
  }
}
