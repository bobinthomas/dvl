import * as React from "react";
import type { ComponentSpec } from "@ds-platform/core/schema";
import { config } from "../config.js";

function buildReactSnippet(spec: ComponentSpec): string {
  const example = spec.examples[0];
  const attrs = Object.entries(example.props)
    .map(([key, value]) => (typeof value === "string" ? `${key}="${value}"` : `${key}={${String(value)}}`))
    .concat(spec.props.some((p) => p.type === "function") ? "onPress={handlePress}" : []);

  const hasLabel = spec.anatomy.parts.some((p) => p.name === "label");
  const openTag = `<${spec.name}${attrs.length ? "\n  " + attrs.join("\n  ") : ""}${hasLabel ? "" : " /"}>`;

  const lines = [
    `import { ${spec.name} } from "@delhivery/ds-react";`,
    "",
    hasLabel ? `${openTag}\n  ${spec.name}\n</${spec.name}>` : openTag,
  ];
  return lines.join("\n");
}

const PLATFORM_LABEL: Record<string, string> = {
  react: "React",
  "react-native": "React Native",
};

const AVAILABLE_SNIPPETS: Record<string, (spec: ComponentSpec) => string> = {
  react: buildReactSnippet,
};

export function CodeTabs({ spec }: { spec: ComponentSpec }) {
  const platforms = config.documentation.code_examples.preferred_order;
  const [active, setActive] = React.useState(platforms.find((p) => AVAILABLE_SNIPPETS[p]) ?? platforms[0]);
  const [copied, setCopied] = React.useState(false);

  const snippet = AVAILABLE_SNIPPETS[active]?.(spec);

  async function handleCopy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="code-tabs">
      <div className="code-tabs__nav" role="tablist">
        {platforms.map((platform) => {
          const available = !!AVAILABLE_SNIPPETS[platform];
          return (
            <button
              key={platform}
              type="button"
              role="tab"
              className="code-tabs__tab"
              aria-selected={active === platform}
              disabled={!available}
              title={available ? undefined : "Not generated yet"}
              onClick={() => available && setActive(platform)}
            >
              {PLATFORM_LABEL[platform] ?? platform}
            </button>
          );
        })}
        {config.documentation.code_examples.include_copy_button && (
          <button
            type="button"
            className="code-tabs__copy"
            disabled={!snippet}
            onClick={handleCopy}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre className="code-block">
        <code>{snippet ?? `// ${PLATFORM_LABEL[active] ?? active} output isn't generated yet.`}</code>
      </pre>
    </div>
  );
}
