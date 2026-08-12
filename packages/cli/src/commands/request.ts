import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  CategorySchema,
  ComponentRequestSchema,
  buildComponentRequest,
  buildDesignBrief,
  findRequestFiles,
  readRequestFile,
  requestPathForId,
  writeRequestFile,
  type ComponentRequest,
} from "@ds-platform/core";
import {
  createFigmaRestClient,
  extractFigmaFileKey,
  loadFigmaEnv,
  reconcileRequest,
  type FigmaClient,
} from "@ds-platform/figma-client";

export interface RequestOptions {
  cwd: string;
}

/** Asks one question, returns the human's answer. Injectable so these commands are testable without a real TTY. */
export type Asker = (prompt: string) => Promise<string>;

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function requestsDirFor(cwd: string): string {
  return join(cwd, "requests");
}

/** Exported for reuse by new.ts's `--from-request` promotion flow. */
export function readRequest(cwd: string, id: string): ComponentRequest | undefined {
  return readRequestFile(requestsDirFor(cwd), id);
}

export function writeRequest(cwd: string, request: ComponentRequest): void {
  writeRequestFile(requestsDirFor(cwd), request);
}

function makeReadlineAsker(): { askFn: Asker; close: () => void } {
  let rl: ReturnType<typeof createInterface> | undefined;
  const askFn: Asker = async (prompt) => {
    if (!rl) rl = createInterface({ input: stdin, output: stdout });
    return rl.question(`${prompt}\n> `);
  };
  return { askFn, close: () => rl?.close() };
}

/**
 * `ds request new <name>` — structured intake for a component that doesn't
 * exist yet, filed as a lightweight pre-spec entity under requests/<id>/.
 * Unlike `ds new`, this is a plain form, not a model-drafted spec: a request
 * only needs to carry enough for a design brief (see `ds request brief`),
 * not a full prop/token contract.
 */
export async function runRequestNew(name: string, options: RequestOptions, ask?: Asker): Promise<boolean> {
  const { cwd } = options;

  if (!KEBAB_CASE.test(name)) {
    console.error(`"${name}" must be kebab-case, e.g. "date-picker"`);
    return false;
  }

  const requestPath = requestPathForId(requestsDirFor(cwd), name);
  if (existsSync(requestPath)) {
    console.error(`requests/${name}/request.json already exists — ds request new never overwrites an existing request`);
    return false;
  }

  const reader = ask ? { askFn: ask, close: () => {} } : makeReadlineAsker();

  try {
    console.log(`\nFiling a component request for "${name}".`);
    const problem = await reader.askFn("What need does this component fill?");
    const category = await reader.askFn(`Category (one of: ${CategorySchema.options.join(", ")})`);
    const notes = await reader.askFn("Any additional notes? (blank for none)");
    const expectedVariantsRaw = await reader.askFn("Expected variants, comma-separated (blank for none)");
    const requestedBy = await reader.askFn("Requested by (your name or handle)");

    const request = buildComponentRequest({
      name,
      category,
      problem,
      notes,
      expectedVariants: expectedVariantsRaw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
      requestedBy,
    });

    const result = ComponentRequestSchema.safeParse(request);
    if (!result.success) {
      for (const issue of result.error.issues) {
        console.error(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      return false;
    }

    writeRequest(cwd, result.data);
    console.log(`\nRequest written to requests/${name}/request.json (status: pending).`);
    return true;
  } finally {
    reader.close();
  }
}

/** `ds request approve <id>` — pending -> approved. Required before a brief can be generated. */
export function runRequestApprove(id: string, options: RequestOptions): boolean {
  const request = readRequest(options.cwd, id);
  if (!request) {
    console.error(`no request found for "${id}" at requests/${id}/request.json`);
    return false;
  }
  if (request.status !== "pending") {
    console.error(`can only approve a pending request (current status: "${request.status}")`);
    return false;
  }

  writeRequest(options.cwd, { ...request, status: "approved" });
  console.log(`requests/${id}/request.json approved.`);
  return true;
}

/**
 * `ds request brief <id>` — renders a design brief for a human designer to
 * build from in Figma. Deliberately a mechanical template, not a model
 * call: it only restates what's already on the request plus the platform's
 * fixed conventions.
 */
export function runRequestBrief(id: string, options: RequestOptions): boolean {
  const request = readRequest(options.cwd, id);
  if (!request) {
    console.error(`no request found for "${id}" at requests/${id}/request.json`);
    return false;
  }
  if (request.status !== "approved") {
    console.error(`can only generate a brief for an approved request (current status: "${request.status}")`);
    return false;
  }

  const briefPath = join(requestsDirFor(options.cwd), id, "BRIEF.md");
  writeFileSync(briefPath, buildDesignBrief(request), "utf-8");
  writeRequest(options.cwd, { ...request, status: "in-design" });

  console.log(`requests/${id}/BRIEF.md written; status set to in-design.`);
  return true;
}

/** `ds request set-figma-file <id> <fileKey>` — records which Figma file the designer built this in. Accepts a pasted Figma URL, not just a bare key. */
export function runRequestSetFigmaFile(id: string, fileKey: string, options: RequestOptions): boolean {
  const request = readRequest(options.cwd, id);
  if (!request) {
    console.error(`no request found for "${id}" at requests/${id}/request.json`);
    return false;
  }

  const key = extractFigmaFileKey(fileKey);
  writeRequest(options.cwd, { ...request, figmaFileKey: key });
  console.log(`requests/${id}/request.json: figmaFileKey set to "${key}".`);
  return true;
}

/**
 * `ds request verify <id>` — reads the live Figma file via the REST API and
 * reconciles it against the request (see @ds-platform/figma-client). The
 * `figmaClient` param is the DI seam, same role `ModelClient` plays for
 * agents: tests inject a fake, a real run leaves it undefined and gets the
 * real REST client.
 */
export async function runRequestVerify(
  id: string,
  options: RequestOptions,
  figmaClient?: FigmaClient
): Promise<boolean> {
  const request = readRequest(options.cwd, id);
  if (!request) {
    console.error(`no request found for "${id}" at requests/${id}/request.json`);
    return false;
  }
  if (request.status !== "in-design") {
    console.error(`can only verify a request that's in-design (current status: "${request.status}")`);
    return false;
  }
  if (!request.figmaFileKey) {
    console.error(
      `requests/${id}/request.json has no figmaFileKey — set it once the designer shares the Figma file (ds request set-figma-file ${id} <fileKey>)`
    );
    return false;
  }

  let client = figmaClient;
  if (!client) {
    let env;
    try {
      env = loadFigmaEnv();
    } catch (err) {
      console.error((err as Error).message);
      return false;
    }
    client = createFigmaRestClient(env);
  }

  // Re-extract even for an already-stored key, in case an earlier
  // `set-figma-file` call persisted a raw URL before this normalization existed.
  const cleanFileKey = extractFigmaFileKey(request.figmaFileKey);
  if (cleanFileKey !== request.figmaFileKey) {
    writeRequest(options.cwd, { ...request, figmaFileKey: cleanFileKey });
  }
  const file = await client.getFile(cleanFileKey);
  const report = reconcileRequest(request, file);

  console.log(`matched: ${report.matched.join(", ") || "(none)"}`);
  for (const issue of report.issues) console.log(`  issue: ${issue}`);

  if (report.ok) {
    writeRequest(options.cwd, { ...request, status: "ready-for-verification" });
    console.log(`requests/${id}/request.json is ready-for-verification.`);
  } else {
    console.log(`requests/${id}/request.json is not yet ready — rerun \`ds request verify ${id}\` once fixed.`);
  }
  return report.ok;
}

/** `ds request list` — every request, grouped by status. */
export function runRequestList(options: RequestOptions): boolean {
  const requestPaths = findRequestFiles(requestsDirFor(options.cwd));
  if (requestPaths.length === 0) {
    console.log("no component requests found under requests/");
    return true;
  }

  const requests = requestPaths.map((p) => ComponentRequestSchema.parse(JSON.parse(readFileSync(p, "utf-8"))));
  const byStatus = new Map<string, ComponentRequest[]>();
  for (const r of requests) {
    if (!byStatus.has(r.status)) byStatus.set(r.status, []);
    byStatus.get(r.status)!.push(r);
  }

  for (const [status, group] of byStatus) {
    console.log(`\n${status.toUpperCase()}`);
    for (const r of group) console.log(`  ${r.id}  (${r.name}) — ${r.problem}`);
  }
  return true;
}
