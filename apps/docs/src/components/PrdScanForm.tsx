import * as React from "react";
import type { GapReport, DocQuality } from "@ds-platform/agents";
import { useSimulation } from "../simulationContext.js";
import { useProviderSettings } from "../providerContext.js";
import { safeConfirm } from "../safeConfirm.js";

type Status = "idle" | "loading" | "error";

interface AnalyzeResponse {
  ok: boolean;
  report?: GapReport;
  docQuality?: Record<string, DocQuality>;
  errors?: string[];
}

interface SamplePrdResponse {
  ok: boolean;
  prdText?: string;
  errors?: string[];
}

/**
 * Wizard step 1: `ds analyze --check-docs`, over HTTP. Posts to
 * /api/dev/analyze, a route that only exists under plain `vite dev` — same
 * graceful-degradation posture every other form in this app uses for its
 * own runtime-scoped route.
 */
export function PrdScanForm({
  onScanned,
}: {
  onScanned: (report: GapReport, docQuality: Record<string, DocQuality> | undefined) => void;
}) {
  const { simulate } = useSimulation();
  const { providerConfig, gatewayConfig } = useProviderSettings();
  const [prdText, setPrdText] = React.useState("");
  const [checkDocs, setCheckDocs] = React.useState(false);
  const [status, setStatus] = React.useState<Status>("idle");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [hint, setHint] = React.useState("");
  const [sampleStatus, setSampleStatus] = React.useState<Status>("idle");
  const [sampleErrors, setSampleErrors] = React.useState<string[]>([]);

  async function handleGenerateSample() {
    if (sampleStatus === "loading") return;
    if (prdText.trim() && !safeConfirm("This will overwrite the PRD text below. Continue?")) return;
    setSampleStatus("loading");
    setSampleErrors([]);
    try {
      const res = await fetch("/api/dev/sample-prd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hint, simulate, providerConfig, gatewayConfig }),
      });
      const data = (await res.json().catch(() => null)) as SamplePrdResponse | null;
      if (!res.ok || !data?.ok) {
        setSampleErrors(data?.errors ?? [`request failed (${res.status})`]);
        setSampleStatus("error");
        return;
      }
      setPrdText(data.prdText ?? "");
      setSampleStatus("idle");
    } catch {
      setSampleErrors(["Generating with AI only works while running `pnpm dev` locally."]);
      setSampleStatus("error");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPrdText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prdText.trim() || status === "loading") return;

    setStatus("loading");
    setErrors([]);
    try {
      const res = await fetch("/api/dev/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prdText, checkDocs, simulate, providerConfig, gatewayConfig }),
      });
      const data = (await res.json().catch(() => null)) as AnalyzeResponse | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStatus("error");
        return;
      }
      setStatus("idle");
      onScanned(data.report ?? { components: [] }, data.docQuality);
    } catch {
      setErrors(["Scanning a PRD only works while running `pnpm dev` locally, with AI Gateway credentials set."]);
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="component-header">
        <span className="kicker">Step 1</span>
        <h1 className="display">Scan a PRD</h1>
        <p className="lede">Classify what a PRD needs against the real components/ inventory.</p>
      </div>

      <form onSubmit={handleSubmit} className="analyze-form">
        <label className="form-field">
          PRD file (optional — or paste below)
          <input type="file" accept=".md,.txt" onChange={handleFile} />
        </label>
        <div className="generate-with-ai">
          <label className="form-field">
            Idea (optional)
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. scheduling a delivery pickup"
            />
          </label>
          <button
            type="button"
            className="generate-with-ai__button"
            onClick={handleGenerateSample}
            disabled={sampleStatus === "loading"}
          >
            {sampleStatus === "loading" ? "Generating…" : "Generate a sample PRD"}
          </button>
          {sampleStatus === "error" &&
            sampleErrors.map((err) => (
              <p key={err} className="ask-widget__answer ask-widget__answer--refused">
                {err}
              </p>
            ))}
        </div>
        <label className="form-field">
          PRD text
          <textarea value={prdText} onChange={(e) => setPrdText(e.target.value)} rows={10} required />
        </label>
        <label className="form-field form-field--inline">
          <input type="checkbox" checked={checkDocs} onChange={(e) => setCheckDocs(e.target.checked)} />
          Also check documentation quality for components already covered
        </label>
        <button type="submit" className="ask-widget__submit" disabled={status === "loading"}>
          {status === "loading" ? "Scanning…" : "Scan PRD"}
        </button>
        {status === "error" &&
          errors.map((err) => (
            <p key={err} className="ask-widget__answer ask-widget__answer--refused">
              {err}
            </p>
          ))}
      </form>
    </div>
  );
}
