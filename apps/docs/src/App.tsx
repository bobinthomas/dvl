import * as React from "react";
import { registry } from "./registry.js";
import { ComponentDoc } from "./components/ComponentDoc.js";

export function App() {
  const [selectedId, setSelectedId] = React.useState(registry[0]?.spec.id);
  const entry = registry.find((e) => e.spec.id === selectedId);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          Design System
          <small>Component specs</small>
        </div>
        <ul className="nav-list">
          {registry.map(({ spec }) => (
            <li key={spec.id}>
              <button
                type="button"
                className="nav-item"
                aria-current={spec.id === selectedId}
                onClick={() => setSelectedId(spec.id)}
              >
                {spec.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="main">
        {entry ? (
          <ComponentDoc entry={entry} />
        ) : (
          <p className="lede">
            No components have been built yet. Run <code>ds build</code> to generate one.
          </p>
        )}
      </main>
    </div>
  );
}
