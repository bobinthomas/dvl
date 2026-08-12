import * as React from "react";

const STORAGE_KEY = "ds-simulate";

interface SimulationState {
  simulate: boolean;
  setSimulate: (value: boolean) => void;
}

const SimulationContext = React.createContext<SimulationState>({
  simulate: false,
  setSimulate: () => {},
});

/**
 * Whether the dev API should fake AI Gateway / Figma REST calls (see
 * dev-server/simulate.ts) so the whole wizard works with zero API keys.
 * Backed by localStorage so it survives the `window.location.reload()`
 * every mutating action in this app already does.
 */
export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulate, setSimulateState] = React.useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  function setSimulate(value: boolean) {
    setSimulateState(value);
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }

  return <SimulationContext.Provider value={{ simulate, setSimulate }}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationState {
  return React.useContext(SimulationContext);
}
