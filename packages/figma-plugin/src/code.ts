import { ComponentSpecSchema } from "@ds-platform/core/schema";
import type { TokenTree } from "@ds-platform/core/tokens";
import { legalCombos } from "./combos.js";
import { collectTokenVars } from "./variables.js";
import { buildComponentSet } from "./builder.js";
import { resolveApiBase } from "./api-base.js";

interface JobSummary {
  id: string;
  requestId: string;
  requestName: string;
  createdAt: string;
}

interface JobDetail extends JobSummary {
  specJson: unknown;
  tokens: unknown;
}

interface UiMessage {
  type: "set-api-base" | "refresh" | "select-job";
  apiBase?: string;
  jobId?: string;
}

let apiBase = "";

async function loadApiBase(): Promise<string> {
  const stored = (await figma.clientStorage.getAsync("apiBase")) as string | undefined;
  apiBase = resolveApiBase(stored);
  return apiBase;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, init);
  const data = (await res.json().catch(() => null)) as { ok?: boolean; errors?: string[] } | null;
  if (!res.ok || !data?.ok) {
    throw new Error(data?.errors?.join("; ") ?? `request to ${path} failed (${res.status})`);
  }
  return data as T;
}

async function fetchPendingJobs(): Promise<JobSummary[]> {
  const data = await fetchJson<{ jobs: JobSummary[] }>("/api/figma/jobs?status=pending");
  return data.jobs;
}

async function fetchJob(id: string): Promise<JobDetail> {
  // claim=1: this is the plugin about to build, not the docs site polling
  // for status — see worker/dev-api.ts's handleGetFigmaJob.
  const data = await fetchJson<{ job: JobDetail }>(`/api/figma/jobs/${id}?claim=1`);
  return data.job;
}

async function postResult(id: string, body: Record<string, unknown>): Promise<void> {
  await fetchJson(`/api/figma/jobs/${id}/result`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Fetches one job's spec (and the platform's real token tree, resolved
 * server-side — see apps/docs/worker/dev-api.ts / dev-server/api.ts, both
 * of which already load tokens/tokens.json for other routes), builds the
 * real component, and reports the result back. Every value driving
 * construction — variant values, token refs, part names — comes from
 * `job.specJson`; nothing about a specific component is hardcoded here.
 */
async function buildJob(job: JobDetail): Promise<void> {
  const spec = ComponentSpecSchema.parse(job.specJson);
  const tokens = job.tokens as TokenTree;

  try {
    // figma.fileKey is a private-plugin-only API — it stays undefined
    // without manifest.json's "enablePrivatePluginApi": true, regardless of
    // whether the file is saved into a real project (see
    // https://developers.figma.com/docs/plugins/api/figma/). Checked before
    // building anything: reconciliation needs a real key to look the file
    // up via the REST API, so there's nothing useful to build toward
    // without one.
    if (!figma.fileKey) {
      throw new Error(
        'figma.fileKey is undefined — check manifest.json has "enablePrivatePluginApi": true, and that this file is saved into a real project (not an unsaved draft), then run the plugin again.'
      );
    }

    const combos = legalCombos(spec);
    const vars = collectTokenVars(spec, tokens);
    const componentSet = await buildComponentSet(spec, vars, combos);

    await postResult(job.id, {
      fileKey: figma.fileKey,
      nodeId: componentSet.id,
      componentSetId: componentSet.id,
      variantKeys: componentSet.children.map((c) => c.id),
      status: "done",
    });
    figma.notify(`Built "${spec.name}" — ${combos.length} variant${combos.length === 1 ? "" : "s"}.`);
  } catch (err) {
    const message = (err as Error).message;
    try {
      await postResult(job.id, { status: "failed", error: message });
    } catch {
      // The callback itself failed (network down, etc.) — surface locally
      // rather than throw an unhandled rejection; the job just stays
      // "claimed" until someone retries or the human checks the docs site.
    }
    figma.notify(`Build failed: ${message}`, { error: true });
  }
}

async function refreshJobList(): Promise<void> {
  try {
    const jobs = await fetchPendingJobs();
    figma.ui.postMessage({ type: "jobs", jobs });
  } catch (err) {
    figma.ui.postMessage({ type: "error", message: (err as Error).message });
  }
}

figma.showUI(__html__, { width: 360, height: 480 });

figma.ui.onmessage = async (msg: UiMessage) => {
  if (msg.type === "set-api-base" && msg.apiBase !== undefined) {
    await figma.clientStorage.setAsync("apiBase", msg.apiBase);
    apiBase = resolveApiBase(msg.apiBase);
    await refreshJobList();
    return;
  }
  if (msg.type === "refresh") {
    await refreshJobList();
    return;
  }
  if (msg.type === "select-job" && msg.jobId) {
    try {
      const job = await fetchJob(msg.jobId);
      await buildJob(job);
    } catch (err) {
      figma.notify(`Error: ${(err as Error).message}`, { error: true });
    }
    await refreshJobList();
  }
};

async function main(): Promise<void> {
  await loadApiBase();
  figma.ui.postMessage({ type: "api-base", apiBase });
  await refreshJobList();
}

main();
