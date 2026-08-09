import type { ComponentSpec } from "@ds-platform/core/schema";
import { resolveToken } from "@ds-platform/core/tokens";
import { tokens } from "../tokens.js";

function collectTokenRefs(spec: ComponentSpec): string[] {
  const refs = new Set<string>();
  for (const binding of spec.tokens) {
    for (const ref of Object.values(binding.properties)) refs.add(ref);
  }
  for (const pair of spec.accessibility.contrast) {
    refs.add(pair.foreground);
    refs.add(pair.background);
  }
  return Array.from(refs).sort();
}

export function TokenMap({ spec }: { spec: ComponentSpec }) {
  const refs = collectTokenRefs(spec);

  return (
    <div className="token-list">
      {refs.map((ref) => {
        const resolved = resolveToken(ref, tokens);
        const isColor = resolved.type === "color";
        return (
          <div className="token-row" key={ref}>
            {isColor ? (
              <span className="token-swatch" style={{ background: String(resolved.value) }} />
            ) : (
              <span />
            )}
            <span className="token-path">{ref}</span>
            <span className="token-value">{String(resolved.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
