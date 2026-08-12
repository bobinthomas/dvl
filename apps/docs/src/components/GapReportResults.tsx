import * as React from "react";
import type { GapReport, DocQuality, ComponentGap } from "@ds-platform/agents";

const CLASSIFICATION_LABEL: Record<string, string> = {
  have: "Have",
  partial: "Partial",
  missing: "Missing",
};

/** Wizard step 2: the gap report + doc-quality results from step 1's scan. */
export function GapReportResults({
  report,
  docQuality,
  onCreateRequest,
  onContinue,
}: {
  report: GapReport;
  docQuality?: Record<string, DocQuality>;
  onCreateRequest: (gap: ComponentGap) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="component-header">
        <span className="kicker">Step 2</span>
        <h1 className="display">Results</h1>
        <p className="lede">What this PRD needs, classified against the real component inventory.</p>
      </div>

      {report.components.length === 0 ? (
        <p className="lede">No reusable components implied by this PRD.</p>
      ) : (
        <section className="doc-section">
          <h2>Gap report</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Classification</th>
                <th>Component</th>
                <th>Evidence</th>
                <th>Missing</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {report.components.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="status-pill">{CLASSIFICATION_LABEL[c.classification] ?? c.classification}</span>
                  </td>
                  <td>
                    <strong>{c.name}</strong>
                    <br />
                    <span className="token-path">{c.id}</span>
                  </td>
                  <td>{c.evidence}</td>
                  <td>
                    {c.missing.length > 0
                      ? c.missing.map((m) => (
                          <span key={m} className="badge">
                            {m}
                          </span>
                        ))
                      : "—"}
                  </td>
                  <td>
                    {c.classification !== "have" && (
                      <button type="button" className="doc-check__button" onClick={() => onCreateRequest(c)}>
                        Create request
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {docQuality && Object.keys(docQuality).length > 0 && (
        <section className="doc-section">
          <h2>Documentation quality (existing coverage)</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Rating</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(docQuality).map(([id, quality]) => (
                <tr key={id}>
                  <td>{id}</td>
                  <td>
                    <span className="status-pill">{quality.rating}</span>
                  </td>
                  <td>{quality.issues.length > 0 ? quality.issues.join("; ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <button type="button" className="ask-widget__submit" onClick={onContinue}>
        Continue to requests →
      </button>
    </div>
  );
}
