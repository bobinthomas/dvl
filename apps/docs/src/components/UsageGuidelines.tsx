import type { ComponentSpec } from "@ds-platform/core/schema";

/**
 * Deterministic, template-driven usage bullets — no model call. Matches
 * BUILD-PROMPT's "Documentation Writer Agent uses templates + pattern
 * matching, not LLM hallucination" even before that agent exists (Phase 5):
 * this is the template half of that idea, running today.
 */
function buildDos(spec: ComponentSpec): string[] {
  const dos: string[] = [spec.description];
  const defaultVariant = spec.props.find((p) => p.type === "enum" && p.default !== undefined);
  if (defaultVariant) {
    dos.push(
      `Use the default ${defaultVariant.name} (${String(defaultVariant.default)}) unless the layout gives you a specific reason not to.`
    );
  }
  return dos;
}

function buildDonts(spec: ComponentSpec): string[] {
  return spec.invalidCombinations.map((combo) => {
    const parts = Object.entries(combo).map(([key, value]) => `${key}: ${value}`);
    return `Don't combine ${parts.join(" with ")}.`;
  });
}

export function UsageGuidelines({ spec }: { spec: ComponentSpec }) {
  const dos = buildDos(spec);
  const donts = buildDonts(spec);

  return (
    <div className="prose">
      <h3>Do</h3>
      <ul className="usage-list usage-list--do">
        {dos.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {donts.length > 0 && (
        <>
          <h3 style={{ marginTop: "1.5rem" }}>Don't</h3>
          <ul className="usage-list usage-list--dont">
            {donts.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
