import * as React from "react";
import type { GapReport, DocQuality, ComponentGap } from "@ds-platform/agents";
import type { RequestFormPrefill } from "./RequestForm.js";
import { PrdScanForm } from "./PrdScanForm.js";
import { GapReportResults } from "./GapReportResults.js";
import { RequestQueue } from "./RequestQueue.js";
import { getQueryParam, setQueryParam } from "../queryState.js";

type Step = "scan" | "results" | "requests" | "generate";

const STEPS: { key: Step; label: string }[] = [
  { key: "scan", label: "Scan PRD" },
  { key: "results", label: "Results" },
  { key: "requests", label: "Make requests" },
  { key: "generate", label: "Generate components" },
];

function isStep(value: string | null): value is Step {
  return value === "scan" || value === "results" || value === "requests" || value === "generate";
}

/**
 * The 4-step MVP flow as a navigable stepper — not gated: every step stays
 * independently usable (approving an existing request, or generating one
 * that's already ready-for-verification, without re-scanning a PRD first).
 * Step 1/2's gap report and a "create request from this gap" pre-fill flow
 * forward into step 3 when you arrive via the guided path.
 */
export function Wizard({ onViewComponent }: { onViewComponent: (id: string) => void }) {
  const [step, setStepState] = React.useState<Step>(() => {
    const fromUrl = getQueryParam("step");
    return isStep(fromUrl) ? fromUrl : "scan";
  });
  const [report, setReport] = React.useState<GapReport | null>(null);
  const [docQuality, setDocQuality] = React.useState<Record<string, DocQuality> | undefined>();
  const [prefill, setPrefill] = React.useState<RequestFormPrefill | undefined>();

  function goToStep(next: Step) {
    setStepState(next);
    setQueryParam("step", next);
  }

  function handleScanned(nextReport: GapReport, nextDocQuality: Record<string, DocQuality> | undefined) {
    setReport(nextReport);
    setDocQuality(nextDocQuality);
    goToStep("results");
  }

  function handleCreateRequest(gap: ComponentGap) {
    setPrefill({ id: gap.id, problem: gap.evidence });
    goToStep("requests");
  }

  return (
    <div>
      <ol className="wizard-steps">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className="wizard-step"
              aria-current={step === s.key}
              onClick={() => goToStep(s.key)}
            >
              <span className="wizard-step__number">{i + 1}</span>
              {s.label}
              {step === s.key && <span className="wizard-step__dot" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ol>

      {step === "scan" && <PrdScanForm onScanned={handleScanned} />}

      {step === "results" &&
        (report ? (
          <GapReportResults
            report={report}
            docQuality={docQuality}
            onCreateRequest={handleCreateRequest}
            onContinue={() => goToStep("requests")}
          />
        ) : (
          <div>
            <p className="lede">No results yet — scan a PRD first.</p>
            <button type="button" className="ask-widget__submit" onClick={() => goToStep("scan")}>
              Go to step 1
            </button>
          </div>
        ))}

      {step === "requests" && (
        <RequestQueue
          statuses={["pending", "approved", "in-design"]}
          prefill={prefill}
          heading={{
            kicker: "Step 3",
            title: "Make requests",
            lede: "File new requests (pre-filled from a gap-report row, or blank) and move them through approval, briefing, and Figma verification.",
          }}
        />
      )}

      {step === "generate" && (
        <RequestQueue
          statuses={["ready-for-verification", "promoted"]}
          showForm={false}
          onViewComponent={onViewComponent}
          heading={{
            kicker: "Step 4",
            title: "Generate components",
            lede: "Requests verified against Figma are ready to draft into a real spec and generate — the same pipeline `ds build` runs.",
          }}
        />
      )}
    </div>
  );
}
