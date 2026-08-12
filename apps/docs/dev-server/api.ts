import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ComponentSpecSchema,
  ComponentRequestSchema,
  buildComponentRequest,
  buildDesignBrief,
  buildPrdContextFromRequest,
  findRequestFiles,
  findSpecFiles,
  flattenTokenPaths,
  loadTokens,
  readRequestFile,
  requestPathForId,
  specPathForId,
  writeRequestFile,
  writeSpecFile,
  type ComponentRequest,
  type ComponentRequestFields,
  type ComponentSpec,
} from "@ds-platform/core";
import { validateSpecFile } from "@ds-platform/validator";
import {
  runGapAnalysis,
  runDocQualityCheck,
  generateInterviewQuestions,
  draftSpecFromAnswers,
  generateRequestContent,
  generateSamplePrd,
  suggestInterviewAnswer,
  mergeStandingQuestions,
  ModelOutputError,
  type DirectProviderConfig,
  type GatewayEnv,
  type InterviewQuestion,
} from "@ds-platform/agents";
import { reconcileRequest, extractFigmaFileKey, type FigmaEnv } from "@ds-platform/figma-client";
import { resolveModelClient, resolveFigmaClient } from "./resolve-client.js";
import {
  simulateGapReport,
  simulateDocQuality,
  simulateInterviewQuestions,
  simulateComponentSpec,
  simulateFigmaReconciliation,
  simulateRequestContent,
  simulateSamplePrd,
  simulateSuggestedAnswer,
} from "./simulate.js";

export interface DevApiContext {
  repoRoot: string;
  componentsDir: string;
  requestsDir: string;
  tokensPath: string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req);
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function loadAllSpecs(componentsDir: string): ComponentSpec[] {
  return findSpecFiles(componentsDir).map((p) => ComponentSpecSchema.parse(JSON.parse(readFileSync(p, "utf-8"))));
}

/**
 * Runs the real `ds build <id>`, as a subprocess — not an in-process
 * `import("@ds-platform/cli/...")` call. `runBuild`'s smoke-check does a
 * raw Node `import()` of the freshly generated .tsx file, which needs a
 * TS/JSX-aware loader active; `ds build` always gets one because it's
 * invoked via `node --import tsx` (see packages/cli/bin/ds.mjs), but this
 * Vite dev server process was started via plain `vite` and has none.
 * Spawning the exact same command a human would run in the terminal
 * sidesteps that entirely, rather than trying to splice a loader hook into
 * an already-running, differently-loaded process.
 */
function runDsBuildSubprocess(repoRoot: string, id: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cliEntry = join(repoRoot, "packages", "cli", "src", "index.ts");
    const child = spawn(process.execPath, ["--import", "tsx", cliEntry, "build", id], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

/**
 * `git clean -fd` scoped to just the three directories a simulation run
 * writes into. Deletes only git-untracked files, so the checked-in `button`
 * example (the one real, worth-keeping component + its generated output)
 * is never touched — everything else under components/requests/generated
 * only exists because a simulated wizard run created it.
 */
function runGitCleanSubprocess(repoRoot: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", ["clean", "-fd", "--", "components", "requests", "generated"], { cwd: repoRoot });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.on("exit", (code) => resolve({ code, output }));
    child.on("error", () => resolve({ code: null, output: "" }));
  });
}

/** Wipes every request/component/generated file a simulation run created. */
async function handleClearGenerated(ctx: DevApiContext, res: ServerResponse): Promise<void> {
  const { code, output } = await runGitCleanSubprocess(ctx.repoRoot);
  if (code !== 0) {
    sendJson(res, 500, { ok: false, errors: ["`git clean` failed — is this running inside a git repo?"] });
    return;
  }
  const removed = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Removing "))
    .map((line) => line.slice("Removing ".length));
  sendJson(res, 200, { ok: true, removed });
}

function readRequestOr404(ctx: DevApiContext, res: ServerResponse, id: string): ComponentRequest | undefined {
  const request = readRequestFile(ctx.requestsDir, id);
  if (!request) {
    sendJson(res, 404, { ok: false, errors: [`no request found for "${id}"`] });
    return undefined;
  }
  return request;
}

/** `ds analyze --check-docs`, over HTTP. */
async function handleAnalyze(ctx: DevApiContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { prdText, checkDocs, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    prdText?: string;
    checkDocs?: boolean;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(req);
  if (!prdText?.trim()) {
    sendJson(res, 400, { ok: false, errors: ["prdText is required"] });
    return;
  }

  const specs = loadAllSpecs(ctx.componentsDir);

  if (simulate) {
    const report = simulateGapReport(specs);
    let docQuality: Record<string, unknown> | undefined;
    if (checkDocs) {
      docQuality = {};
      for (const c of report.components) {
        if (c.classification !== "have") continue;
        const spec = specs.find((s) => s.id === c.id);
        if (spec) docQuality[c.id] = simulateDocQuality(spec);
      }
    }
    sendJson(res, 200, { ok: true, report, docQuality });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;

  try {
    const report = await runGapAnalysis(client, model, prdText, specs);

    let docQuality: Record<string, unknown> | undefined;
    if (checkDocs) {
      docQuality = {};
      for (const c of report.components) {
        if (c.classification !== "have") continue;
        const spec = specs.find((s) => s.id === c.id);
        if (!spec) continue;
        docQuality[c.id] = await runDocQualityCheck(client, model, spec);
      }
    }

    sendJson(res, 200, { ok: true, report, docQuality });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/** `ds doc-check <id>`, over HTTP. */
async function handleDocCheck(ctx: DevApiContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { id, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    id?: string;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(req);
  if (!id) {
    sendJson(res, 400, { ok: false, errors: ["id is required"] });
    return;
  }
  const specPath = specPathForId(ctx.componentsDir, id);
  if (!existsSync(specPath)) {
    sendJson(res, 404, { ok: false, errors: [`no spec found for "${id}"`] });
    return;
  }

  const validation = validateSpecFile(specPath, ctx.tokensPath);
  if (!validation.valid) {
    sendJson(res, 200, {
      ok: true,
      quality: { rating: "needs-improvement", issues: validation.issues.map((i) => i.message) },
    });
    return;
  }

  if (simulate) {
    const spec = ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
    sendJson(res, 200, { ok: true, quality: simulateDocQuality(spec) });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;
  const spec = ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));

  try {
    const quality = await runDocQualityCheck(client, model, spec);
    sendJson(res, 200, { ok: true, quality });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/** `ds request new`, over HTTP. */
async function handleRequestNew(ctx: DevApiContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const fields = await parseJsonBody<ComponentRequestFields>(req);
  const result = ComponentRequestSchema.safeParse(buildComponentRequest(fields));
  if (!result.success) {
    sendJson(res, 400, {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    });
    return;
  }
  if (existsSync(requestPathForId(ctx.requestsDir, result.data.id))) {
    sendJson(res, 409, { ok: false, errors: [`a request for "${result.data.id}" already exists`] });
    return;
  }
  writeRequestFile(ctx.requestsDir, result.data);
  sendJson(res, 200, { ok: true, id: result.data.id });
}

/** `ds request approve <id>`, over HTTP. */
function handleApprove(ctx: DevApiContext, res: ServerResponse, id: string): void {
  const request = readRequestOr404(ctx, res, id);
  if (!request) return;
  if (request.status !== "pending") {
    sendJson(res, 409, {
      ok: false,
      errors: [`can only approve a pending request (current status: "${request.status}")`],
    });
    return;
  }
  writeRequestFile(ctx.requestsDir, { ...request, status: "approved" });
  sendJson(res, 200, { ok: true });
}

/** `ds request brief <id>`, over HTTP. */
function handleBrief(ctx: DevApiContext, res: ServerResponse, id: string): void {
  const request = readRequestOr404(ctx, res, id);
  if (!request) return;
  if (request.status !== "approved") {
    sendJson(res, 409, {
      ok: false,
      errors: [`can only generate a brief for an approved request (current status: "${request.status}")`],
    });
    return;
  }
  const brief = buildDesignBrief(request);
  writeFileSync(join(ctx.requestsDir, id, "BRIEF.md"), brief, "utf-8");
  writeRequestFile(ctx.requestsDir, { ...request, status: "in-design" });
  sendJson(res, 200, { ok: true, brief });
}

/** `ds request set-figma-file` + `ds request verify`, combined into one round trip. */
async function handleVerify(
  ctx: DevApiContext,
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const request = readRequestOr404(ctx, res, id);
  if (!request) return;
  if (request.status !== "in-design") {
    sendJson(res, 409, {
      ok: false,
      errors: [`can only verify a request that's in-design (current status: "${request.status}")`],
    });
    return;
  }

  const { figmaFileKey: rawFigmaFileKey, simulate, figmaConfig } = await parseJsonBody<{
    figmaFileKey?: string;
    simulate?: boolean;
    figmaConfig?: FigmaEnv;
  }>(req);
  let current = request;
  // Accepts a pasted Figma URL, not just a bare key — the natural thing to
  // copy from the browser's address bar. Also self-heals an already-stored
  // key if an earlier verify attempt persisted a raw URL before this
  // normalization existed — done unconditionally, before credentials are
  // even resolved, so it can't be skipped by a 503/missing-token path.
  const nextFileKey = rawFigmaFileKey
    ? extractFigmaFileKey(rawFigmaFileKey)
    : current.figmaFileKey
      ? extractFigmaFileKey(current.figmaFileKey)
      : undefined;
  if (nextFileKey && nextFileKey !== current.figmaFileKey) {
    current = { ...current, figmaFileKey: nextFileKey };
    writeRequestFile(ctx.requestsDir, current);
  }

  if (simulate) {
    const report = simulateFigmaReconciliation(current);
    if (report.ok) {
      writeRequestFile(ctx.requestsDir, { ...current, status: "ready-for-verification" });
    }
    sendJson(res, 200, { ok: true, report });
    return;
  }

  if (!current.figmaFileKey) {
    sendJson(res, 400, { ok: false, errors: ["figmaFileKey is required — paste the Figma file key first"] });
    return;
  }

  const resolvedFigma = resolveFigmaClient(figmaConfig);
  if ("error" in resolvedFigma) {
    sendJson(res, 503, { ok: false, errors: [resolvedFigma.error] });
    return;
  }
  const { client } = resolvedFigma;
  const file = await client.getFile(current.figmaFileKey);
  const report = reconcileRequest(current, file);

  if (report.ok) {
    writeRequestFile(ctx.requestsDir, { ...current, status: "ready-for-verification" });
  }
  sendJson(res, 200, { ok: true, report });
}

/** `ds new --from-request <id>`, step 1: generate the interview questions. */
async function handlePromoteQuestions(
  ctx: DevApiContext,
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const request = readRequestOr404(ctx, res, id);
  if (!request) return;
  if (request.status !== "ready-for-verification") {
    sendJson(res, 409, {
      ok: false,
      errors: [`can only promote a request that's ready-for-verification (current status: "${request.status}")`],
    });
    return;
  }

  const { simulate, providerConfig, gatewayConfig, standingQuestions } = await parseJsonBody<{
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
    standingQuestions?: InterviewQuestion[];
  }>(req);
  if (simulate) {
    sendJson(res, 200, {
      ok: true,
      questions: mergeStandingQuestions(standingQuestions ?? [], simulateInterviewQuestions().questions),
    });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;

  try {
    const { questions } = await generateInterviewQuestions(
      client,
      model,
      request.name,
      buildPrdContextFromRequest(request),
      standingQuestions ?? []
    );
    sendJson(res, 200, { ok: true, questions: mergeStandingQuestions(standingQuestions ?? [], questions) });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/** `ds new --from-request <id>`, step 2: draft and write the spec, promote the request. */
async function handlePromoteDraft(
  ctx: DevApiContext,
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const request = readRequestOr404(ctx, res, id);
  if (!request) return;
  if (request.status !== "ready-for-verification") {
    sendJson(res, 409, {
      ok: false,
      errors: [`can only promote a request that's ready-for-verification (current status: "${request.status}")`],
    });
    return;
  }
  if (existsSync(specPathForId(ctx.componentsDir, id))) {
    sendJson(res, 409, { ok: false, errors: [`components/${id}/spec.json already exists`] });
    return;
  }

  const { answers, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    answers?: Record<string, string>;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(req);

  if (simulate) {
    const spec = simulateComponentSpec(request);
    writeSpecFile(ctx.componentsDir, spec);
    writeRequestFile(ctx.requestsDir, { ...request, status: "promoted", promotedSpecId: id });
    const built = await runDsBuildSubprocess(ctx.repoRoot, id);
    sendJson(res, 200, { ok: true, specId: id, built });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;

  try {
    const spec = await draftSpecFromAnswers(
      client,
      model,
      request.name,
      buildPrdContextFromRequest(request),
      answers ?? {},
      flattenTokenPaths(loadTokens(ctx.tokensPath))
    );
    writeSpecFile(ctx.componentsDir, spec);
    writeRequestFile(ctx.requestsDir, { ...request, status: "promoted", promotedSpecId: id });

    const built = await runDsBuildSubprocess(ctx.repoRoot, id);
    sendJson(res, 200, { ok: true, specId: id, built });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/** "Generate with AI" for RequestForm's problem/notes/expectedVariants fields. */
async function handleGenerateRequestContent(
  ctx: DevApiContext,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const { name, category, hint, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    name?: string;
    category?: string;
    hint?: string;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(req);
  if (!category) {
    sendJson(res, 400, { ok: false, errors: ["category is required"] });
    return;
  }

  if (simulate) {
    sendJson(res, 200, { ok: true, ...simulateRequestContent({ name, category }) });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;

  try {
    const draft = await generateRequestContent(client, model, { name, category, hint });
    sendJson(res, 200, { ok: true, ...draft });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/** "Generate a sample PRD" for PrdScanForm's PRD textarea. */
async function handleSamplePrd(ctx: DevApiContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { hint, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    hint?: string;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(req);

  if (simulate) {
    sendJson(res, 200, { ok: true, ...simulateSamplePrd() });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;

  try {
    const sample = await generateSamplePrd(client, model, hint);
    sendJson(res, 200, { ok: true, ...sample });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/** "Suggest an answer" for one of PromoteForm's interview questions. */
async function handlePromoteSuggestAnswer(
  ctx: DevApiContext,
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const request = readRequestOr404(ctx, res, id);
  if (!request) return;
  if (request.status !== "ready-for-verification") {
    sendJson(res, 409, {
      ok: false,
      errors: [`can only suggest an answer for a request that's ready-for-verification (current status: "${request.status}")`],
    });
    return;
  }

  const { question, otherQuestions, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    question?: InterviewQuestion;
    otherQuestions?: InterviewQuestion[];
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(req);
  if (!question) {
    sendJson(res, 400, { ok: false, errors: ["question is required"] });
    return;
  }

  if (simulate) {
    sendJson(res, 200, { ok: true, ...simulateSuggestedAnswer() });
    return;
  }

  const resolved = resolveModelClient(providerConfig, gatewayConfig);
  if ("error" in resolved) {
    sendJson(res, 503, { ok: false, errors: [resolved.error] });
    return;
  }
  const { client, model } = resolved;

  try {
    const suggestion = await suggestInterviewAnswer(
      client,
      model,
      request.name,
      buildPrdContextFromRequest(request),
      question,
      otherQuestions ?? []
    );
    sendJson(res, 200, { ok: true, ...suggestion });
  } catch (err) {
    if (err instanceof ModelOutputError) {
      sendJson(res, 502, { ok: false, errors: [err.message] });
      return;
    }
    throw err;
  }
}

/**
 * Reports which server-side env vars are set, as booleans only — never
 * values — so the Settings page can show "this machine already has a
 * CF_AI_GATEWAY_TOKEN" (or doesn't) without ever exposing it to the browser.
 */
function handleEnvStatus(res: ServerResponse): void {
  sendJson(res, 200, {
    ok: true,
    gateway: {
      accountId: !!process.env.CF_AI_GATEWAY_ACCOUNT_ID,
      gatewayId: !!process.env.CF_AI_GATEWAY_ID,
      token: !!process.env.CF_AI_GATEWAY_TOKEN,
      model: !!process.env.DS_MODEL,
    },
    figma: { accessToken: !!process.env.FIGMA_ACCESS_TOKEN },
  });
}

/**
 * Every filed request, read straight off disk with a plain readdirSync —
 * never Vite's dev-time `import.meta.glob`, which depends on its file
 * watcher noticing new requests/<id>/request.json files. That watcher can
 * silently go stale on Windows (e.g. after "Clear all generated" deletes
 * and a refiled request recreates the requests/ directory), serving an
 * empty scan indefinitely until the whole dev server is restarted. This
 * route can't go stale the same way: every call re-reads the filesystem.
 */
function handleRequestsList(ctx: DevApiContext, res: ServerResponse): void {
  const requests = findRequestFiles(ctx.requestsDir).map((requestPath) => {
    const request = ComponentRequestSchema.parse(JSON.parse(readFileSync(requestPath, "utf-8")));
    const briefPath = join(dirname(requestPath), "BRIEF.md");
    const brief = existsSync(briefPath) ? readFileSync(briefPath, "utf-8") : undefined;
    return { request, brief };
  });
  sendJson(res, 200, { ok: true, requests });
}

/**
 * Every component spec (+ CHANGELOG.md and generated React source, if
 * present), read straight off disk — same rationale as handleRequestsList,
 * and the same fix for the same class of staleness registry.ts used to hit
 * via `import.meta.glob` for `components/*​/spec.json`. `reactTsx`/`reactCss`
 * ship as source text rather than a `/@fs/...` URL for the client to
 * `import()`: the deployed Worker backing this same route has no
 * filesystem for such a URL to resolve against (see worker/dev-api.ts), so
 * registry.ts compiles the source with Sucrase in the browser instead —
 * one rendering path for both backends. If a component was never built (or
 * the last build failed), `reactTsx` is just absent and the client omits
 * that entry, matching the old behavior.
 */
function handleComponentsList(ctx: DevApiContext, res: ServerResponse): void {
  const components = findSpecFiles(ctx.componentsDir).map((specPath) => {
    const spec = ComponentSpecSchema.parse(JSON.parse(readFileSync(specPath, "utf-8")));
    const changelogPath = join(dirname(specPath), "CHANGELOG.md");
    const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, "utf-8") : undefined;
    const tsxPath = join(ctx.repoRoot, "generated", "react", `${spec.name}.tsx`);
    const cssPath = join(ctx.repoRoot, "generated", "react", `${spec.id}.css`);
    const reactTsx = existsSync(tsxPath) ? readFileSync(tsxPath, "utf-8") : undefined;
    const reactCss = existsSync(cssPath) ? readFileSync(cssPath, "utf-8") : undefined;
    return { spec, changelog, reactTsx, reactCss };
  });
  sendJson(res, 200, { ok: true, components });
}

/**
 * Every local-dev-only route the docs app's UI drives, dispatched by hand
 * (no router dependency, matching this repo's minimal-deps style) under one
 * mount point. See vite.config.ts's requestsDevApiPlugin for why this file
 * is loaded via `server.ssrLoadModule` rather than imported directly.
 */
export async function handleDevApi(ctx: DevApiContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, errors: ["method not allowed"] });
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 1 && parts[0] === "env-status") return handleEnvStatus(res);
    if (parts.length === 1 && parts[0] === "clear-generated") return await handleClearGenerated(ctx, res);
    if (parts.length === 2 && parts[0] === "requests" && parts[1] === "list") return handleRequestsList(ctx, res);
    if (parts.length === 2 && parts[0] === "components" && parts[1] === "list") return handleComponentsList(ctx, res);
    if (parts.length === 1 && parts[0] === "analyze") return await handleAnalyze(ctx, req, res);
    if (parts.length === 1 && parts[0] === "doc-check") return await handleDocCheck(ctx, req, res);
    if (parts.length === 1 && parts[0] === "sample-prd") return await handleSamplePrd(ctx, req, res);
    if (parts.length === 2 && parts[0] === "requests" && parts[1] === "generate-content")
      return await handleGenerateRequestContent(ctx, req, res);
    if (parts.length === 1 && parts[0] === "requests") return await handleRequestNew(ctx, req, res);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "approve") return handleApprove(ctx, res, parts[1]);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "brief") return handleBrief(ctx, res, parts[1]);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "verify")
      return await handleVerify(ctx, req, res, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "promote" && parts[3] === "questions")
      return await handlePromoteQuestions(ctx, req, res, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "promote" && parts[3] === "draft")
      return await handlePromoteDraft(ctx, req, res, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "promote" && parts[3] === "suggest-answer")
      return await handlePromoteSuggestAnswer(ctx, req, res, parts[1]);

    sendJson(res, 404, { ok: false, errors: ["not found"] });
  } catch (err) {
    console.error("[dev-api] unhandled error:", err);
    sendJson(res, 500, { ok: false, errors: [(err as Error).message ?? "unexpected error"] });
  }
}
