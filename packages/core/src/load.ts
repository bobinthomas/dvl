import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TokenTree } from "./tokens.js";
import { ComponentRequestSchema, type ComponentRequest } from "./request-schema.js";
import type { ComponentSpec } from "./schema.js";

export interface RawFile {
  filePath: string;
  json: unknown;
}

function readJson(filePath: string): unknown {
  const text = readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${filePath}: invalid JSON — ${(err as Error).message}`);
  }
}

/** Read a component spec file as raw JSON (unvalidated). Validation is the validator package's job. */
export function loadSpecRaw(filePath: string): RawFile {
  return { filePath, json: readJson(filePath) };
}

/** Read the DTCG token tree. */
export function loadTokens(filePath: string): TokenTree {
  return readJson(filePath) as TokenTree;
}

/** Find every components/<id>/spec.json under `componentsDir`. */
export function findSpecFiles(componentsDir: string): string[] {
  if (!existsSync(componentsDir)) return [];
  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(componentsDir, e.name, "spec.json"))
    .filter((p) => existsSync(p));
}

export function specPathForId(componentsDir: string, id: string): string {
  return join(componentsDir, id, "spec.json");
}

/** Write components/<id>/spec.json, creating the directory if needed. */
export function writeSpecFile(componentsDir: string, spec: ComponentSpec): void {
  const dir = join(componentsDir, spec.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spec.json"), JSON.stringify(spec, null, 2) + "\n", "utf-8");
}

/** Find every requests/<id>/request.json under `requestsDir`. */
export function findRequestFiles(requestsDir: string): string[] {
  if (!existsSync(requestsDir)) return [];
  return readdirSync(requestsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(requestsDir, e.name, "request.json"))
    .filter((p) => existsSync(p));
}

export function requestPathForId(requestsDir: string, id: string): string {
  return join(requestsDir, id, "request.json");
}

/** Read one requests/<id>/request.json, or undefined if it doesn't exist. */
export function readRequestFile(requestsDir: string, id: string): ComponentRequest | undefined {
  const path = requestPathForId(requestsDir, id);
  if (!existsSync(path)) return undefined;
  return ComponentRequestSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
}

/** Write requests/<id>/request.json, creating the directory if needed. */
export function writeRequestFile(requestsDir: string, request: ComponentRequest): void {
  const dir = join(requestsDir, request.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "request.json"), JSON.stringify(request, null, 2) + "\n", "utf-8");
}
