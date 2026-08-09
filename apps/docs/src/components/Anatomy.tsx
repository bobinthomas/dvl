import type { ComponentSpec } from "@ds-platform/core/schema";

export function Anatomy({ spec }: { spec: ComponentSpec }) {
  return (
    <div className="prose">
      <p>
        Root: <code>{spec.anatomy.root}</code>
      </p>
      {spec.anatomy.parts.length > 0 && (
        <table className="data-table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Part</th>
              <th>Description</th>
              <th>Presence</th>
            </tr>
          </thead>
          <tbody>
            {spec.anatomy.parts.map((part) => (
              <tr key={part.name}>
                <td>
                  <code>{part.name}</code>
                </td>
                <td>{part.description}</td>
                <td>
                  <span className="badge">{part.optional ? "optional" : "required"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
