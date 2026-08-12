import * as React from "react";
import type { DocQuality } from "@ds-platform/agents";
import { useSimulation } from "../simulationContext.js";
import { useProviderSettings } from "../providerContext.js";

type Status = "idle" | "loading" | "done" | "error";

interface DocCheckResponse {
  ok: boolean;
  quality?: DocQuality;
  errors?: string[];
}

/**
 * `ds doc-check <id>`, over HTTP. Posts to /api/dev/doc-check — same
 * runtime-scoped-route posture as every other form in this app.
 */
export function DocCheckButton({ id }: { id: string }) {
  const { simulate } = useSimulation();
  const { providerConfig, gatewayConfig } = useProviderSettings();
  const [status, setStatus] = React.useState<Status>("idle");
  const [quality, setQuality] = React.useState<DocQuality | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);

  async function handleClick() {
    if (status === "loading") return;
    setStatus("loading");
    setErrors([]);
    setQuality(null);
    try {
      const res = await fetch("/api/dev/doc-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, simulate, providerConfig, gatewayConfig }),
      });
      const data = (await res.json().catch(() => null)) as DocCheckResponse | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStatus("error");
        return;
      }
      setQuality(data.quality ?? null);
      setStatus("done");
    } catch {
      setErrors(["Checking documentation only works while running `pnpm dev` locally, with AI Gateway credentials set."]);
      setStatus("error");
    }
  }

  return (
    <div className="doc-check">
      <button type="button" className="doc-check__button" onClick={handleClick} disabled={status === "loading"}>
        {status === "loading" ? "Checking…" : "Check documentation"}
      </button>
      {status === "done" && quality && (
        <p className={`doc-check__result${quality.rating === "adequate" ? "" : " doc-check__result--needs-work"}`}>
          <strong>{quality.rating}</strong>
          {quality.issues.length > 0 && ` — ${quality.issues.join("; ")}`}
        </p>
      )}
      {status === "error" && errors.map((err) => <p key={err} className="doc-check__result doc-check__result--needs-work">{err}</p>)}
    </div>
  );
}
