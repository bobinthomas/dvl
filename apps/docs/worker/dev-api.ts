import {
  ComponentSpecSchema,
  ComponentRequestSchema,
  buildComponentRequest,
  buildDesignBrief,
  buildPrdContextFromRequest,
  draftJobSpec,
  flattenTokenPaths,
  type ComponentRequest,
  type ComponentRequestFields,
  type ComponentSpec,
  type StandingBriefConfig,
} from "@ds-platform/core";
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
import { generateReact, type TemplateRenderer } from "@ds-platform/generator-react";
import tokensJson from "../../../tokens/tokens.json";
import { resolveModelClient, resolveFigmaClient, type WorkerEnv } from "./resolve-client.js";
import {
  listRequests,
  getRequest,
  requestExists,
  putRequest,
  listComponents,
  componentExists,
  putComponent,
  clearGenerated,
  createFigmaJob,
  listPendingFigmaJobs,
  getFigmaJob,
  claimFigmaJob,
  completeFigmaJob,
  type FigmaJob,
} from "./dev-storage.js";
import {
  simulateGapReport,
  simulateDocQuality,
  simulateInterviewQuestions,
  simulateComponentSpec,
  simulateFigmaReconciliation,
  simulateRequestContent,
  simulateSamplePrd,
  simulateSuggestedAnswer,
  simulateFigmaJobResult,
} from "./simulate.js";

export interface DevApiEnv extends WorkerEnv {
  DB: D1Database;
}

const tokenTree = tokensJson as import("@ds-platform/core").TokenTree;

/**
 * Mirrors packages/generators/react/templates/component.tsx.hbs exactly —
 * that template is pure `{{{variable}}}` interpolation, no Handlebars
 * logic, so this plain template literal produces byte-identical output
 * without needing Handlebars' `new Function`-based compiler, which the
 * Workers isolate refuses to run. See render-template.ts.
 */
const renderComponentTemplate: TemplateRenderer = (context) =>
  `${context.header}
// Import "./${context.id}.css" (and "./tokens.css") alongside this component —
// styling is data-attribute driven and lives entirely in that stylesheet.
import * as React from "react";

${context.typesBlock}

${context.componentBlock}
`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function parseJsonBody<T>(request: Request): Promise<T> {
  const text = await request.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function requestOr404(env: DevApiEnv, id: string): Promise<{ request: ComponentRequest; brief?: string } | Response> {
  const stored = await getRequest(env.DB, id);
  if (!stored) return json({ ok: false, errors: [`no request found for "${id}"`] }, 404);
  return stored;
}

/** `ds analyze --check-docs`, as a Worker route reading the D1 component inventory. */
async function handleAnalyze(env: DevApiEnv, request: Request): Promise<Response> {
  const { prdText, checkDocs, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    prdText?: string;
    checkDocs?: boolean;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(request);
  if (!prdText?.trim()) return json({ ok: false, errors: ["prdText is required"] }, 400);

  const specs = (await listComponents(env.DB)).map((c) => c.spec);

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
    return json({ ok: true, report, docQuality });
  }

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
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
    return json({ ok: true, report, docQuality });
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

/**
 * `ds doc-check <id>`, as a Worker route. Skips dev-server/api.ts's
 * validateSpecFile gate — that gate exists to catch a hand-edited
 * components/<id>/spec.json failing schema/token-reference checks before a
 * disk-based rebuild; every D1-stored spec already passed
 * ComponentSpecSchema.parse (and, if AI-drafted, was constrained to real
 * token paths) on the way in, so that failure mode can't occur here.
 */
async function handleDocCheck(env: DevApiEnv, request: Request): Promise<Response> {
  const { id, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    id?: string;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(request);
  if (!id) return json({ ok: false, errors: ["id is required"] }, 400);

  const components = await listComponents(env.DB);
  const stored = components.find((c) => c.spec.id === id);
  if (!stored) return json({ ok: false, errors: [`no spec found for "${id}"`] }, 404);

  if (simulate) return json({ ok: true, quality: simulateDocQuality(stored.spec) });

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
  const { client, model } = resolved;

  try {
    const quality = await runDocQualityCheck(client, model, stored.spec);
    return json({ ok: true, quality });
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

/** `ds request new`, as a Worker route. */
async function handleRequestNew(env: DevApiEnv, request: Request): Promise<Response> {
  const fields = await parseJsonBody<ComponentRequestFields>(request);
  const result = ComponentRequestSchema.safeParse(buildComponentRequest(fields));
  if (!result.success) {
    return json(
      { ok: false, errors: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) },
      400
    );
  }
  if (await requestExists(env.DB, result.data.id)) {
    return json({ ok: false, errors: [`a request for "${result.data.id}" already exists`] }, 409);
  }
  await putRequest(env.DB, result.data);
  return json({ ok: true, id: result.data.id });
}

async function handleApprove(env: DevApiEnv, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "pending") {
    return json({ ok: false, errors: [`can only approve a pending request (current status: "${found.request.status}")`] }, 409);
  }
  await putRequest(env.DB, { ...found.request, status: "approved" }, found.brief);
  return json({ ok: true });
}

async function handleBrief(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "approved" && found.request.status !== "in-design") {
    return json(
      {
        ok: false,
        errors: [`can only generate a brief for an approved or in-design request (current status: "${found.request.status}")`],
      },
      409
    );
  }
  const { standingBrief } = await parseJsonBody<{ standingBrief?: StandingBriefConfig }>(request);
  const brief = buildDesignBrief(found.request, standingBrief);
  // Already in-design (regenerating after an edit) stays in-design — this
  // route only ever moves a request forward on its first run, never back.
  const nextStatus = found.request.status === "approved" ? "in-design" : found.request.status;
  await putRequest(env.DB, { ...found.request, status: nextStatus }, brief);
  return json({ ok: true, brief });
}

/**
 * Lets a not-yet-promoted request's editable fields be revised after
 * filing. This changes the *inputs* buildDesignBrief renders from — for
 * editing the brief's actual prose directly, see handleSaveBrief below.
 * `id`/`name`/`category` kebab/Pascal identity and everything
 * status-machine-related stay fixed; only content fields are editable.
 */
async function handleEditRequest(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status === "promoted" || found.request.status === "rejected") {
    return json({ ok: false, errors: [`cannot edit a request that's already ${found.request.status}`] }, 409);
  }

  const body = await parseJsonBody<{
    category?: string;
    problem?: string;
    notes?: string;
    expectedVariants?: string[];
  }>(request);

  const candidate = {
    ...found.request,
    category: body.category ?? found.request.category,
    problem: body.problem ?? found.request.problem,
    notes: body.notes?.trim() ? body.notes : undefined,
    expectedVariants: body.expectedVariants ?? found.request.expectedVariants,
  };
  const result = ComponentRequestSchema.safeParse(candidate);
  if (!result.success) {
    return json({ ok: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
  }

  await putRequest(env.DB, result.data, found.brief);
  return json({ ok: true });
}

/**
 * Saves hand-edited brief text verbatim — no template involved, unlike
 * handleBrief. Only once a brief exists at all (in-design): editing before
 * that point has nothing to edit yet.
 */
async function handleSaveBrief(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "in-design") {
    return json(
      { ok: false, errors: [`can only save brief edits for an in-design request (current status: "${found.request.status}")`] },
      409
    );
  }
  const { brief } = await parseJsonBody<{ brief?: string }>(request);
  if (!brief?.trim()) {
    return json({ ok: false, errors: ["brief text is required"] }, 400);
  }
  await putRequest(env.DB, found.request, brief);
  return json({ ok: true });
}

async function handleVerify(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "in-design") {
    return json(
      { ok: false, errors: [`can only verify a request that's in-design (current status: "${found.request.status}")`] },
      409
    );
  }

  const { figmaFileKey: rawFigmaFileKey, simulate, figmaConfig } = await parseJsonBody<{
    figmaFileKey?: string;
    simulate?: boolean;
    figmaConfig?: FigmaEnv;
  }>(request);

  let current = found.request;
  const nextFileKey = rawFigmaFileKey
    ? extractFigmaFileKey(rawFigmaFileKey)
    : current.figmaFileKey
      ? extractFigmaFileKey(current.figmaFileKey)
      : undefined;
  if (nextFileKey && nextFileKey !== current.figmaFileKey) {
    current = { ...current, figmaFileKey: nextFileKey };
    await putRequest(env.DB, current, found.brief);
  }

  if (simulate) {
    const report = simulateFigmaReconciliation(current);
    if (report.ok) await putRequest(env.DB, { ...current, status: "ready-for-verification" }, found.brief);
    return json({ ok: true, report });
  }

  if (!current.figmaFileKey) {
    return json({ ok: false, errors: ["figmaFileKey is required — paste the Figma file key first"] }, 400);
  }

  const resolvedFigma = resolveFigmaClient(env, figmaConfig);
  if ("error" in resolvedFigma) return json({ ok: false, errors: [resolvedFigma.error] }, 503);

  const file = await resolvedFigma.client.getFile(current.figmaFileKey);
  const report = reconcileRequest(current, file);
  if (report.ok) await putRequest(env.DB, { ...current, status: "ready-for-verification" }, found.brief);
  return json({ ok: true, report });
}

async function handlePromoteQuestions(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "ready-for-verification") {
    return json(
      {
        ok: false,
        errors: [`can only promote a request that's ready-for-verification (current status: "${found.request.status}")`],
      },
      409
    );
  }

  const { simulate, providerConfig, gatewayConfig, standingQuestions } = await parseJsonBody<{
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
    standingQuestions?: InterviewQuestion[];
  }>(request);
  if (simulate) {
    return json({
      ok: true,
      questions: mergeStandingQuestions(standingQuestions ?? [], simulateInterviewQuestions().questions),
    });
  }

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
  const { client, model } = resolved;

  try {
    const { questions } = await generateInterviewQuestions(
      client,
      model,
      found.request.name,
      buildPrdContextFromRequest(found.request),
      standingQuestions ?? []
    );
    return json({ ok: true, questions: mergeStandingQuestions(standingQuestions ?? [], questions) });
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

/**
 * `ds new --from-request <id>` + `ds build <id>`, combined into one round
 * trip. The spec-drafting half calls the AI Gateway (or is faked by
 * `simulate`); the code-generation half — `generateReact` — always runs for
 * real regardless of `simulate`, exactly like dev-server/api.ts's
 * runDsBuildSubprocess did: `simulate` only stands in for AI/Figma calls,
 * never for the deterministic codegen a real `ds build` performs. Unlike
 * local dev, there's no `smokeRenderCheck` (react-dom/server render probe)
 * or downstream React Native/Figma-plugin/stories/tests output — those are
 * artifacts a human pulls via `ds build` locally before actually shipping a
 * component into the repo; this route's job is letting the Wizard produce
 * and preview a real generated React component end-to-end in the browser.
 */
async function handlePromoteDraft(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "ready-for-verification") {
    return json(
      {
        ok: false,
        errors: [`can only promote a request that's ready-for-verification (current status: "${found.request.status}")`],
      },
      409
    );
  }
  if (await componentExists(env.DB, id)) {
    return json({ ok: false, errors: [`components/${id}/spec.json already exists`] }, 409);
  }
  const { request: componentRequest, brief } = found;

  const { answers, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    answers?: Record<string, string>;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(request);

  async function generateAndStore(spec: ComponentSpec): Promise<Response> {
    const files = generateReact(spec, renderComponentTemplate);
    const tsx = files.find((f) => f.filePath.endsWith(".tsx"))!;
    const css = files.find((f) => f.filePath.endsWith(".css"))!;
    await putComponent(env.DB, spec, { reactTsx: tsx.contents, reactCss: css.contents });
    await putRequest(env.DB, { ...componentRequest, status: "promoted", promotedSpecId: id }, brief);
    return json({ ok: true, specId: id, built: true });
  }

  if (simulate) return generateAndStore(simulateComponentSpec(componentRequest));

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
  const { client, model } = resolved;

  try {
    const spec = await draftSpecFromAnswers(
      client,
      model,
      componentRequest.name,
      buildPrdContextFromRequest(componentRequest),
      answers ?? {},
      flattenTokenPaths(tokenTree)
    );
    return await generateAndStore(spec);
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

async function handleGenerateRequestContent(env: DevApiEnv, request: Request): Promise<Response> {
  const { name, category, hint, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    name?: string;
    category?: string;
    hint?: string;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(request);
  if (!category) return json({ ok: false, errors: ["category is required"] }, 400);

  if (simulate) return json({ ok: true, ...simulateRequestContent({ name, category }) });

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
  const { client, model } = resolved;

  try {
    const draft = await generateRequestContent(client, model, { name, category, hint });
    return json({ ok: true, ...draft });
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

async function handleSamplePrd(env: DevApiEnv, request: Request): Promise<Response> {
  const { hint, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    hint?: string;
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(request);

  if (simulate) return json({ ok: true, ...simulateSamplePrd() });

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
  const { client, model } = resolved;

  try {
    const sample = await generateSamplePrd(client, model, hint);
    return json({ ok: true, ...sample });
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

async function handlePromoteSuggestAnswer(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "ready-for-verification") {
    return json(
      {
        ok: false,
        errors: [
          `can only suggest an answer for a request that's ready-for-verification (current status: "${found.request.status}")`,
        ],
      },
      409
    );
  }

  const { question, otherQuestions, simulate, providerConfig, gatewayConfig } = await parseJsonBody<{
    question?: InterviewQuestion;
    otherQuestions?: InterviewQuestion[];
    simulate?: boolean;
    providerConfig?: DirectProviderConfig;
    gatewayConfig?: GatewayEnv;
  }>(request);
  if (!question) return json({ ok: false, errors: ["question is required"] }, 400);

  if (simulate) return json({ ok: true, ...simulateSuggestedAnswer() });

  const resolved = resolveModelClient(env, providerConfig, gatewayConfig);
  if ("error" in resolved) return json({ ok: false, errors: [resolved.error] }, 503);
  const { client, model } = resolved;

  try {
    const suggestion = await suggestInterviewAnswer(
      client,
      model,
      found.request.name,
      buildPrdContextFromRequest(found.request),
      question,
      otherQuestions ?? []
    );
    return json({ ok: true, ...suggestion });
  } catch (err) {
    if (err instanceof ModelOutputError) return json({ ok: false, errors: [err.message] }, 502);
    throw err;
  }
}

function handleEnvStatus(env: DevApiEnv): Response {
  return json({
    ok: true,
    gateway: {
      accountId: !!env.CF_AI_GATEWAY_ACCOUNT_ID,
      gatewayId: !!env.CF_AI_GATEWAY_ID,
      token: !!env.CF_AI_GATEWAY_TOKEN,
      model: !!env.DS_MODEL,
    },
    figma: { accessToken: !!env.FIGMA_ACCESS_TOKEN },
  });
}

async function handleClearGeneratedRoute(env: DevApiEnv): Promise<Response> {
  const { removedRequests, removedComponents } = await clearGenerated(env.DB);
  return json({ ok: true, removed: [...removedRequests, ...removedComponents] });
}

async function handleRequestsList(env: DevApiEnv): Promise<Response> {
  const requests = await listRequests(env.DB);
  return json({ ok: true, requests: requests.map((r) => ({ request: r.request, brief: r.brief })) });
}

/**
 * Every component's spec plus its generated React source/CSS, straight from
 * D1 — registry.ts compiles `reactTsx` in the browser with Sucrase instead
 * of dynamically `import()`-ing a `/@fs/...` file URL, since a deployed
 * Worker has no filesystem for such a URL to resolve against.
 */
async function handleComponentsList(env: DevApiEnv): Promise<Response> {
  const components = await listComponents(env.DB);
  return json({
    ok: true,
    components: components.map((c) => ({
      spec: c.spec,
      changelog: c.changelog,
      reactTsx: c.reactTsx,
      reactCss: c.reactCss,
    })),
  });
}

/**
 * Re-runs codegen for an already-promoted component's stored spec — no spec
 * change, just refreshing `react_tsx`/`react_css` after a
 * @ds-platform/generator-react change (e.g. custom anatomy part support)
 * so an existing promoted component picks up the fix without redoing the
 * whole request lifecycle.
 */
async function handleRegenerateComponent(env: DevApiEnv, id: string): Promise<Response> {
  const components = await listComponents(env.DB);
  const stored = components.find((c) => c.spec.id === id);
  if (!stored) return json({ ok: false, errors: [`no component found for "${id}"`] }, 404);

  const files = generateReact(stored.spec, renderComponentTemplate);
  const tsx = files.find((f) => f.filePath.endsWith(".tsx"))!;
  const css = files.find((f) => f.filePath.endsWith(".css"))!;
  await putComponent(env.DB, stored.spec, { reactTsx: tsx.contents, reactCss: css.contents });
  return json({ ok: true, specId: id, regenerated: true });
}

export async function handleDevApi(env: DevApiEnv, request: Request, pathname: string): Promise<Response> {
  try {
    if (request.method !== "POST") return json({ ok: false, errors: ["method not allowed"] }, 405);

    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 1 && parts[0] === "env-status") return handleEnvStatus(env);
    if (parts.length === 1 && parts[0] === "clear-generated") return await handleClearGeneratedRoute(env);
    if (parts.length === 2 && parts[0] === "requests" && parts[1] === "list") return await handleRequestsList(env);
    if (parts.length === 2 && parts[0] === "components" && parts[1] === "list") return await handleComponentsList(env);
    if (parts.length === 3 && parts[0] === "components" && parts[2] === "regenerate")
      return await handleRegenerateComponent(env, parts[1]);
    if (parts.length === 1 && parts[0] === "analyze") return await handleAnalyze(env, request);
    if (parts.length === 1 && parts[0] === "doc-check") return await handleDocCheck(env, request);
    if (parts.length === 1 && parts[0] === "sample-prd") return await handleSamplePrd(env, request);
    if (parts.length === 2 && parts[0] === "requests" && parts[1] === "generate-content")
      return await handleGenerateRequestContent(env, request);
    if (parts.length === 1 && parts[0] === "requests") return await handleRequestNew(env, request);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "approve") return await handleApprove(env, parts[1]);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "brief") return await handleBrief(env, request, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "brief" && parts[3] === "save")
      return await handleSaveBrief(env, request, parts[1]);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "edit")
      return await handleEditRequest(env, request, parts[1]);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "verify") return await handleVerify(env, request, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "promote" && parts[3] === "questions")
      return await handlePromoteQuestions(env, request, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "promote" && parts[3] === "draft")
      return await handlePromoteDraft(env, request, parts[1]);
    if (parts.length === 4 && parts[0] === "requests" && parts[2] === "promote" && parts[3] === "suggest-answer")
      return await handlePromoteSuggestAnswer(env, request, parts[1]);

    return json({ ok: false, errors: ["not found"] }, 404);
  } catch (err) {
    console.error("[dev-api] unhandled error:", err);
    return json({ ok: false, errors: [(err as Error).message ?? "unexpected error"] }, 500);
  }
}

// --- Figma round trip: the build-job queue the plugin (packages/figma-plugin)
// and the docs site both talk to. Mounted at a separate /api/figma/ prefix,
// not under handleDevApi's /api/dev/* — those routes are POST-only and only
// ever called by this same docs app; these need real GET support for the
// plugin's fetch() calls, and are called cross-origin from Figma's plugin
// sandbox, so (unlike /api/dev/*) they need CORS.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

interface JobResultBody {
  fileKey?: string;
  nodeId?: string;
  componentSetId?: string;
  variantKeys?: string[];
  status: "done" | "failed";
  error?: string;
  simulate?: boolean;
  figmaConfig?: FigmaEnv;
}

/**
 * Shared by the real POST /result callback and the simulated branch of job
 * creation (see §E's "let the callback path run end to end"). Reuses
 * resolveFigmaClient/reconcileRequest/simulateFigmaReconciliation exactly
 * as handleVerify already does — no reconciliation logic is duplicated.
 */
async function completeJob(env: DevApiEnv, job: FigmaJob, body: JobResultBody): Promise<Response> {
  if (body.status === "failed") {
    await completeFigmaJob(env.DB, job.id, "failed", { error: body.error ?? "unknown error" });
    return json({ ok: true, job: { id: job.id, status: "failed", error: body.error } });
  }

  const found = await getRequest(env.DB, job.requestId);
  if (!found) {
    await completeFigmaJob(env.DB, job.id, "failed", { error: `request "${job.requestId}" no longer exists` });
    return json({ ok: false, errors: [`request "${job.requestId}" no longer exists`] }, 404);
  }
  if (!body.fileKey) {
    await completeFigmaJob(env.DB, job.id, "failed", { error: "the plugin did not report a fileKey" });
    return json({ ok: false, errors: ["fileKey is required for a done job"] }, 400);
  }

  const current = { ...found.request, figmaFileKey: body.fileKey };

  let report;
  if (body.simulate) {
    report = simulateFigmaReconciliation(current);
  } else {
    const resolvedFigma = resolveFigmaClient(env, body.figmaConfig);
    if ("error" in resolvedFigma) {
      await completeFigmaJob(env.DB, job.id, "failed", { error: resolvedFigma.error });
      return json({ ok: false, errors: [resolvedFigma.error] }, 503);
    }
    const file = await resolvedFigma.client.getFile(body.fileKey);
    report = reconcileRequest(current, file);
  }

  const nextStatus = report.ok ? "ready-for-verification" : "in-design";
  await putRequest(env.DB, { ...current, status: nextStatus }, found.brief);

  const result = {
    fileKey: body.fileKey,
    nodeId: body.nodeId,
    componentSetId: body.componentSetId,
    variantKeys: body.variantKeys,
    reconciliation: report,
  };
  await completeFigmaJob(env.DB, job.id, "done", result);
  return json({ ok: true, job: { id: job.id, status: "done", result } });
}

/** "Send to Figma" — creates a pending job from an approved/in-design request's synthesized job spec (see draftJobSpec). */
async function handleCreateFigmaJob(env: DevApiEnv, request: Request): Promise<Response> {
  const { requestId, simulate } = await parseJsonBody<{ requestId?: string; simulate?: boolean }>(request);
  if (!requestId) return json({ ok: false, errors: ["requestId is required"] }, 400);

  const found = await getRequest(env.DB, requestId);
  if (!found) return json({ ok: false, errors: [`no request found for "${requestId}"`] }, 404);
  if (found.request.status !== "approved" && found.request.status !== "in-design") {
    return json(
      {
        ok: false,
        errors: [`can only send an approved or in-design request to Figma (current status: "${found.request.status}")`],
      },
      409
    );
  }

  const spec = draftJobSpec(found.request);
  const id = crypto.randomUUID();
  await createFigmaJob(env.DB, { id, requestId, spec, targetFileKey: found.request.figmaFileKey });

  if (simulate) {
    const job = await getFigmaJob(env.DB, id);
    return completeJob(env, job!, { ...simulateFigmaJobResult(spec), simulate: true });
  }

  return json({ ok: true, jobId: id, status: "pending" });
}

async function handleListPendingFigmaJobs(env: DevApiEnv): Promise<Response> {
  const [jobs, requests] = await Promise.all([listPendingFigmaJobs(env.DB), listRequests(env.DB)]);
  const nameById = new Map(requests.map((r) => [r.request.id, r.request.name]));
  return json({
    ok: true,
    jobs: jobs.map((j) => ({
      id: j.id,
      requestId: j.requestId,
      requestName: nameById.get(j.requestId) ?? j.requestId,
      createdAt: j.createdAt,
    })),
  });
}

/**
 * `claim=1` (the plugin's own fetch, right before it starts building) flips
 * a pending job to claimed as a side effect. Docs-site polling omits it —
 * polling must stay read-only, or every poll right after job creation would
 * itself flip pending to claimed before a human ever opened Figma.
 */
async function handleGetFigmaJob(env: DevApiEnv, id: string, claim: boolean): Promise<Response> {
  const job = await getFigmaJob(env.DB, id);
  if (!job) return json({ ok: false, errors: [`no job found for "${id}"`] }, 404);
  if (claim && job.status === "pending") await claimFigmaJob(env.DB, id);

  const found = await getRequest(env.DB, job.requestId);
  return json({
    ok: true,
    job: {
      id: job.id,
      requestId: job.requestId,
      requestName: found?.request.name ?? job.requestId,
      status: claim && job.status === "pending" ? "claimed" : job.status,
      createdAt: job.createdAt,
      specJson: job.spec,
      tokens: tokenTree,
      result: job.result,
    },
  });
}

async function handlePostFigmaJobResult(env: DevApiEnv, request: Request, id: string): Promise<Response> {
  const job = await getFigmaJob(env.DB, id);
  if (!job) return json({ ok: false, errors: [`no job found for "${id}"`] }, 404);
  const body = await parseJsonBody<JobResultBody>(request);
  return completeJob(env, job, body);
}

export async function handleFigmaApi(env: DevApiEnv, request: Request, pathname: string, search: URLSearchParams): Promise<Response> {
  if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

  try {
    const parts = pathname.split("/").filter(Boolean);
    let response: Response;

    if (parts.length === 1 && parts[0] === "jobs" && request.method === "POST") {
      response = await handleCreateFigmaJob(env, request);
    } else if (parts.length === 1 && parts[0] === "jobs" && request.method === "GET") {
      response = await handleListPendingFigmaJobs(env);
    } else if (parts.length === 2 && parts[0] === "jobs" && request.method === "GET") {
      response = await handleGetFigmaJob(env, parts[1]!, search.get("claim") === "1");
    } else if (parts.length === 3 && parts[0] === "jobs" && parts[2] === "result" && request.method === "POST") {
      response = await handlePostFigmaJobResult(env, request, parts[1]!);
    } else {
      response = json({ ok: false, errors: ["not found"] }, 404);
    }

    return withCors(response);
  } catch (err) {
    console.error("[figma-api] unhandled error:", err);
    return withCors(json({ ok: false, errors: [(err as Error).message ?? "unexpected error"] }, 500));
  }
}
