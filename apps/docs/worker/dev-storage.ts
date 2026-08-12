import type { ComponentRequest, ComponentSpec } from "@ds-platform/core";

/**
 * D1-backed replacement for dev-server/api.ts's fs reads/writes
 * (findRequestFiles/readRequestFile/writeRequestFile/findSpecFiles/
 * writeSpecFile) — a deployed Worker has no filesystem, so the request
 * queue and component inventory live in D1 instead of requests/*​/request.json
 * and components/*​/spec.json. One JSON blob per row, same shape those files
 * already validate, so both backends agree on what a request/component is.
 *
 * `git clean -fd -- components requests generated` (the local "Clear all
 * generated" button) keeps every git-tracked file and deletes everything
 * else. D1 has no such distinction, so these two ids stand in for "the
 * examples checked into this repo" — keep them in sync with components/ and
 * requests/ if either gains or loses a checked-in example.
 */
export const SEED_COMPONENT_IDS = ["button", "status-indicator"];
export const SEED_REQUEST_IDS = ["status-indicator", "time-slot-picker"];

export interface StoredRequest {
  request: ComponentRequest;
  brief?: string;
}

export interface StoredComponent {
  spec: ComponentSpec;
  changelog?: string;
  reactTsx?: string;
  reactCss?: string;
}

interface RequestRow {
  data: string;
  brief: string | null;
}

interface ComponentRow {
  spec: string;
  changelog: string | null;
  react_tsx: string | null;
  react_css: string | null;
}

function rowToRequest(row: RequestRow): StoredRequest {
  return { request: JSON.parse(row.data) as ComponentRequest, brief: row.brief ?? undefined };
}

function rowToComponent(row: ComponentRow): StoredComponent {
  return {
    spec: JSON.parse(row.spec) as ComponentSpec,
    changelog: row.changelog ?? undefined,
    reactTsx: row.react_tsx ?? undefined,
    reactCss: row.react_css ?? undefined,
  };
}

export async function listRequests(db: D1Database): Promise<StoredRequest[]> {
  const { results } = await db.prepare("SELECT data, brief FROM requests ORDER BY id").all<RequestRow>();
  return results.map(rowToRequest);
}

export async function getRequest(db: D1Database, id: string): Promise<StoredRequest | undefined> {
  const row = await db.prepare("SELECT data, brief FROM requests WHERE id = ?").bind(id).first<RequestRow>();
  return row ? rowToRequest(row) : undefined;
}

export async function requestExists(db: D1Database, id: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM requests WHERE id = ?").bind(id).first();
  return row !== null;
}

/** Upserts a request. `brief`, when omitted, leaves any previously stored brief untouched. */
export async function putRequest(db: D1Database, request: ComponentRequest, brief?: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO requests (id, data, brief, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data,
         brief = COALESCE(?, requests.brief),
         updated_at = excluded.updated_at`
    )
    .bind(request.id, JSON.stringify(request), brief ?? null, new Date().toISOString(), brief ?? null)
    .run();
}

export async function listComponents(db: D1Database): Promise<StoredComponent[]> {
  const { results } = await db
    .prepare("SELECT spec, changelog, react_tsx, react_css FROM components ORDER BY id")
    .all<ComponentRow>();
  return results.map(rowToComponent);
}

export async function componentExists(db: D1Database, id: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM components WHERE id = ?").bind(id).first();
  return row !== null;
}

export async function putComponent(
  db: D1Database,
  spec: ComponentSpec,
  generated?: { reactTsx: string; reactCss: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO components (id, spec, react_tsx, react_css, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET spec = excluded.spec,
         react_tsx = excluded.react_tsx, react_css = excluded.react_css, updated_at = excluded.updated_at`
    )
    .bind(spec.id, JSON.stringify(spec), generated?.reactTsx ?? null, generated?.reactCss ?? null, new Date().toISOString())
    .run();
}

/** Deletes every request/component a Wizard run created, keeping the seed examples. */
export async function clearGenerated(db: D1Database): Promise<{ removedRequests: string[]; removedComponents: string[] }> {
  const [requests, components] = await Promise.all([listRequests(db), listComponents(db)]);
  const removedRequests = requests.map((r) => r.request.id).filter((id) => !SEED_REQUEST_IDS.includes(id));
  const removedComponents = components.map((c) => c.spec.id).filter((id) => !SEED_COMPONENT_IDS.includes(id));

  const stmts = [
    ...removedRequests.map((id) => db.prepare("DELETE FROM requests WHERE id = ?").bind(id)),
    ...removedComponents.map((id) => db.prepare("DELETE FROM components WHERE id = ?").bind(id)),
  ];
  if (stmts.length > 0) await db.batch(stmts);

  return { removedRequests, removedComponents };
}
