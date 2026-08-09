#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "..", "src", "run.ts");

const result = spawnSync(process.execPath, ["--import", "tsx", entry], {
  stdio: "inherit",
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
