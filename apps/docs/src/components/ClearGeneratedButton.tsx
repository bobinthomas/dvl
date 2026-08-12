import * as React from "react";
import { useSimulation } from "../simulationContext.js";
import { safeConfirm } from "../safeConfirm.js";

type Status = "idle" | "loading" | "error";

/**
 * Wipes every request/component/generated file a simulation run created
 * (git-untracked; the checked-in `button` example is git-tracked and stays
 * put) so the wizard can be replayed from a clean slate without a terminal.
 * Simulation-only — a real run's output is worth keeping, so this only
 * renders while `simulate` is on.
 */
export function ClearGeneratedButton() {
  const { simulate } = useSimulation();
  const [status, setStatus] = React.useState<Status>("idle");
  const [errors, setErrors] = React.useState<string[]>([]);

  if (!simulate) return null;

  async function handleClick() {
    if (status === "loading") return;
    if (!safeConfirm("Delete every request, component, and generated file created by simulation runs?")) return;
    setStatus("loading");
    setErrors([]);
    try {
      const res = await fetch("/api/dev/clear-generated", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { ok: boolean; errors?: string[] } | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStatus("error");
        return;
      }
      window.location.reload();
    } catch {
      setErrors(["This action only works while running `pnpm dev` locally."]);
      setStatus("error");
    }
  }

  return (
    <div>
      <button type="button" className="clear-generated" onClick={handleClick} disabled={status === "loading"}>
        {status === "loading" ? "Clearing…" : "Clear all generated"}
      </button>
      {status === "error" &&
        errors.map((err) => (
          <p key={err} className="ask-widget__answer ask-widget__answer--refused">
            {err}
          </p>
        ))}
    </div>
  );
}
