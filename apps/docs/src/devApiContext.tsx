import * as React from "react";

type DevApiStatus = "checking" | "available" | "unavailable";

const DevApiContext = React.createContext<DevApiStatus>("checking");

/**
 * Whether /api/dev/* (the Wizard's PRD-scan/request/promote backend) is
 * reachable — true only under `pnpm dev`, since those routes are a Vite
 * dev-server plugin with real Node fs access that a deployed Cloudflare
 * Worker doesn't have (see vite.config.ts). Probed once via the same
 * env-status route SettingsPage already calls, so the Wizard can show one
 * clear "run locally" message instead of every form 404ing independently.
 */
export function DevApiProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<DevApiStatus>("checking");

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/env-status", { method: "POST" })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "available" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <DevApiContext.Provider value={status}>{children}</DevApiContext.Provider>;
}

export function useDevApi(): DevApiStatus {
  return React.useContext(DevApiContext);
}
