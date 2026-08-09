import type { ComponentEntry } from "../registry.js";

export function Changelog({ entry }: { entry: ComponentEntry }) {
  if (!entry.changelog) {
    return (
      <p className="changelog-empty">
        No changelog yet — version {entry.spec.version} is this component's first generation. Entries appear
        here automatically once a merged spec change produces one.
      </p>
    );
  }
  return <pre className="code-block">{entry.changelog}</pre>;
}
