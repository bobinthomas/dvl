import type { ComponentSpec, ComponentState } from "@ds-platform/core/schema";

const PSEUDO_CLASS: Partial<Record<ComponentState, string>> = {
  hover: ":hover — pointer over the component.",
  active: ":active — while pressed.",
  focus: ":focus-visible — reached via keyboard, not click.",
};

function triggerFor(spec: ComponentSpec, state: ComponentState): string {
  if (state === "default") return "Initial appearance; no interaction yet.";
  const pseudo = PSEUDO_CLASS[state];
  if (pseudo) return pseudo;
  const prop = spec.props.find((p) => p.name === state && p.type === "boolean");
  if (prop) return `Prop-driven — set ${prop.name}={true}.`;
  return "Prop-driven.";
}

export function States({ spec }: { spec: ComponentSpec }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>State</th>
          <th>Triggered by</th>
        </tr>
      </thead>
      <tbody>
        {spec.states.map((state) => (
          <tr key={state}>
            <td>
              <code>{state}</code>
            </td>
            <td>{triggerFor(spec, state)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
