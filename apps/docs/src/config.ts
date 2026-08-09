import { parse } from "yaml";
import configRaw from "../../../.ds-config.yaml?raw";

export interface DocsConfig {
  documentation: {
    tone: string;
    audience: string;
    default_language: string;
    sections: Record<string, boolean>;
    code_examples: {
      preferred_order: string[];
      include_copy_button: boolean;
    };
  };
}

export const config = parse(configRaw) as DocsConfig;

export function sectionEnabled(name: string): boolean {
  return config.documentation.sections[name] ?? true;
}
