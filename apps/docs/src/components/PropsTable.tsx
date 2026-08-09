import type { ComponentSpec } from "@ds-platform/core/schema";

function typeLabel(prop: ComponentSpec["props"][number]): string {
  if (prop.type === "enum") return (prop.values ?? []).join(" | ");
  if (prop.type === "function") return "() => void";
  return prop.type;
}

export function PropsTable({ spec }: { spec: ComponentSpec }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Prop</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {spec.props.map((prop) => (
          <tr key={prop.name}>
            <td>
              <code>{prop.name}</code>
              {prop.required && <span className="badge badge--required" style={{ marginLeft: "0.4rem" }}>required</span>}
            </td>
            <td>
              <code>{typeLabel(prop)}</code>
            </td>
            <td>{prop.default !== undefined ? <code>{String(prop.default)}</code> : "—"}</td>
            <td>{prop.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
