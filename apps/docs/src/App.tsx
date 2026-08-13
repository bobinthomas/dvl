import * as React from "react";
import { useRegistry } from "./registry.js";
import { useInjectedStyles } from "./useInjectedStyles.js";
import { ComponentDoc } from "./components/ComponentDoc.js";
import { Wizard } from "./components/Wizard.js";
import { AskWidget } from "./components/AskWidget.js";
import { ClearGeneratedButton } from "./components/ClearGeneratedButton.js";
import { SettingsPage } from "./components/SettingsPage.js";
import { getQueryParam, setQueryParam } from "./queryState.js";
import { useSimulation } from "./simulationContext.js";
import { useDevApi } from "./devApiContext.js";

type View = "wizard" | "components" | "settings";

function isView(value: string | null): value is View {
  return value === "wizard" || value === "components" || value === "settings";
}

export function App() {
  const { simulate, setSimulate } = useSimulation();
  const devApi = useDevApi();
  const { entries: registry, loading: registryLoading, error: registryError } = useRegistry();
  useInjectedStyles(registry);
  const [view, setViewState] = React.useState<View>(() => {
    const fromUrl = getQueryParam("view");
    return isView(fromUrl) ? fromUrl : "wizard";
  });
  const [selectedId, setSelectedId] = React.useState(() => getQueryParam("id") ?? undefined);
  const effectiveSelectedId = selectedId ?? registry[0]?.spec.id;
  const entry = registry.find((e) => e.spec.id === effectiveSelectedId);

  function setView(next: View) {
    setViewState(next);
    setQueryParam("view", next);
  }

  function selectComponent(id: string) {
    setSelectedId(id);
    setQueryParam("id", id);
  }

  /** After step 4 generates a component, a real page navigation is what makes useRegistry() fetch it fresh (its effect only runs once per mount). */
  function navigateToComponent(id: string) {
    window.location.href = `/?view=components&id=${id}`;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <button type="button" className="sidebar__brand" onClick={() => setView("wizard")}>
          Design System
          <small>Component specs</small>
        </button>
        <button
          type="button"
          className="all-components-button"
          aria-current={view === "components"}
          onClick={() => setView("components")}
        >
          All Components
        </button>
        <hr className="sidebar__divider" />
        {view === "components" && (
          <>
            <ul className="nav-list">
              {registry.map(({ spec }) => (
                <li key={spec.id}>
                  <button
                    type="button"
                    className="nav-item"
                    aria-current={spec.id === selectedId}
                    onClick={() => selectComponent(spec.id)}
                  >
                    {spec.name}
                  </button>
                </li>
              ))}
            </ul>
            <AskWidget />
          </>
        )}
        {devApi === "available" && (
          <div className="sidebar-panel">
            <button
              type="button"
              className="simulate-toggle"
              aria-pressed={simulate}
              onClick={() => setSimulate(!simulate)}
            >
              <span className="simulate-toggle__track">
                <span className="simulate-toggle__thumb" />
              </span>
              Simulation mode
              <small>no API keys needed</small>
            </button>
            <ClearGeneratedButton />
          </div>
        )}
        <button type="button" className="settings-nav-button" aria-current={view === "settings"} onClick={() => setView("settings")}>
          Settings
        </button>
      </aside>
      <main className="main">
        {view === "wizard" ? (
          devApi === "unavailable" ? (
            <div>
              <div className="component-header">
                <span className="kicker">Wizard</span>
                <h1 className="display">Local dev only</h1>
                <p className="lede">
                  Scanning PRDs, filing requests, and generating components read and write files in
                  this repo, so the Wizard only works while running <code>pnpm dev</code> locally —
                  not on this deployed site.
                </p>
              </div>
            </div>
          ) : devApi === "checking" ? null : (
            <Wizard onViewComponent={navigateToComponent} />
          )
        ) : view === "settings" ? (
          <SettingsPage />
        ) : registryLoading ? (
          <p className="lede">Loading components…</p>
        ) : registryError ? (
          <p className="ask-widget__answer ask-widget__answer--refused">{registryError}</p>
        ) : entry ? (
          <ComponentDoc entry={entry} />
        ) : (
          <p className="lede">
            No components have been built yet. Run the Wizard, or <code>ds build</code>, to generate one.
          </p>
        )}
      </main>
    </div>
  );
}
