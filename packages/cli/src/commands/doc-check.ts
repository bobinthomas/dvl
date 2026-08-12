import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ComponentSpecSchema, findSpecFiles, specPathForId, type ComponentSpec } from "@ds-platform/core";
import { validateSpecFile, formatResult } from "@ds-platform/validator";
import {
  createGatewayClient,
  loadGatewayEnv,
  runDocQualityCheck,
  ModelOutputError,
  type DocQuality,
  type ModelClient,
} from "@ds-platform/agents";

export interface DocCheckOptions {
  cwd: string;
}

function loadSpecs(cwd: string, id: string | undefined): { specPath: string; spec: ComponentSpec }[] {
  const componentsDir = join(cwd, "components");
  const specPaths = id
    ? [specPathForId(componentsDir, id)].filter((p) => existsSync(p))
    : findSpecFiles(componentsDir);
  return specPaths.map((specPath) => ({
    specPath,
    spec: ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8"))),
  }));
}

export function formatQuality(id: string, name: string, quality: DocQuality): string {
  const lines = [`${quality.rating.toUpperCase().padEnd(17)} ${id}  (${name})`];
  for (const issue of quality.issues) lines.push(`  issue: ${issue}`);
  return lines.join("\n");
}

/**
 * `ds doc-check [id]` — judges whether each component's documentation is
 * proper enough to adopt without asking questions. A spec that fails schema
 * validation is reported as needs-improvement with the validator's own
 * issues, no model call spent on it.
 */
export async function runDocCheck(
  id: string | undefined,
  options: DocCheckOptions,
  client?: ModelClient
): Promise<boolean> {
  const { cwd } = options;
  const componentsDir = join(cwd, "components");
  const tokensPath = join(cwd, "tokens", "tokens.json");

  const entries = loadSpecs(cwd, id);
  if (entries.length === 0) {
    console.error(
      id ? `no spec found for "${id}" at ${specPathForId(componentsDir, id)}` : `no specs found under ${componentsDir}`
    );
    return false;
  }

  let env;
  try {
    env = loadGatewayEnv();
  } catch (err) {
    console.error((err as Error).message);
    return false;
  }
  const modelClient = client ?? createGatewayClient(env);

  let allAdequate = true;
  for (const { specPath, spec } of entries) {
    const validation = validateSpecFile(specPath, tokensPath);
    if (!validation.valid) {
      console.log(`NEEDS-IMPROVEMENT     ${spec.id}  (${spec.name})`);
      console.log(formatResult(validation));
      allAdequate = false;
      continue;
    }

    try {
      const quality = await runDocQualityCheck(modelClient, env.model, spec);
      console.log(formatQuality(spec.id, spec.name, quality));
      if (quality.rating !== "adequate") allAdequate = false;
    } catch (err) {
      if (err instanceof ModelOutputError) {
        console.error(`doc quality check failed for "${spec.id}": ${err.message}`);
        return false;
      }
      throw err;
    }
  }
  return allAdequate;
}
