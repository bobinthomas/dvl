import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { TokenTree } from "./tokens.js";

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
