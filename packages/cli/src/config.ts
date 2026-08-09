import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface DsConfig {
  generation: {
    code: {
      include_unit_tests: boolean;
      include_storybook: boolean;
    };
  };
}

/** Reads .ds-config.yaml — the single dial for what `ds build` emits alongside React. */
export function loadDsConfig(cwd: string): DsConfig {
  const raw = parse(readFileSync(join(cwd, ".ds-config.yaml"), "utf-8"));
  return raw as DsConfig;
}
