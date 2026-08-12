import {
  ComponentSpecSchema,
  ComponentRequestSchema,
  buildComponentRequest,
  buildDesignBrief,
  buildPrdContextFromRequest,
  flattenTokenPaths,
  type ComponentRequest,
  type ComponentRequestFields,
  type ComponentSpec,
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

async function handleBrief(env: DevApiEnv, id: string): Promise<Response> {
  const found = await requestOr404(env, id);
  if (found instanceof Response) return found;
  if (found.request.status !== "approved") {
    return json(
      { ok: false, errors: [`can only generate a brief for an approved request (current status: "${found.request.status}")`] },
      409
    );
  }
  const brief = buildDesignBrief(found.request);
  await putRequest(env.DB, { ...found.request, status: "in-design" }, brief);
  return json({ ok: true, brief });
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

export async function handleDevApi(env: DevApiEnv, request: Request, pathname: string): Promise<Response> {
  try {
    if (request.method !== "POST") return json({ ok: false, errors: ["method not allowed"] }, 405);

    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 1 && parts[0] === "env-status") return handleEnvStatus(env);
    if (parts.length === 1 && parts[0] === "clear-generated") return await handleClearGeneratedRoute(env);
    if (parts.length === 2 && parts[0] === "requests" && parts[1] === "list") return await handleRequestsList(env);
    if (parts.length === 2 && parts[0] === "components" && parts[1] === "list") return await handleComponentsList(env);
    if (parts.length === 1 && parts[0] === "analyze") return await handleAnalyze(env, request);
    if (parts.length === 1 && parts[0] === "doc-check") return await handleDocCheck(env, request);
    if (parts.length === 1 && parts[0] === "sample-prd") return await handleSamplePrd(env, request);
    if (parts.length === 2 && parts[0] === "requests" && parts[1] === "generate-content")
      return await handleGenerateRequestContent(env, request);
    if (parts.length === 1 && parts[0] === "requests") return await handleRequestNew(env, request);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "approve") return await handleApprove(env, parts[1]);
    if (parts.length === 3 && parts[0] === "requests" && parts[2] === "brief") return await handleBrief(env, parts[1]);
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
