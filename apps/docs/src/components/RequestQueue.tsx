import * as React from "react";
import type { ComponentRequestStatus } from "@ds-platform/core/request-schema";
import { useRequestRegistry, type RequestEntry } from "../requestRegistry.js";
import { RequestForm, type RequestFormPrefill } from "./RequestForm.js";
import { RequestActions } from "./RequestActions.js";

const STATUS_ORDER: ComponentRequestStatus[] = [
  "pending",
  "approved",
  "in-design",
  "ready-for-verification",
  "promoted",
  "rejected",
];

function DesignBrief({ brief }: { brief: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <details>
      <summary>Design brief</summary>
      <div className="code-tabs__nav">
        <button type="button" className="copy-button" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap" }}>
        {brief}
      </pre>
    </details>
  );
}

function RequestRow({ entry, onViewComponent }: { entry: RequestEntry; onViewComponent?: (id: string) => void }) {
  const { request, brief } = entry;
  return (
    <tr>
      <td>
        <strong>{request.name}</strong>
        <br />
        <span className="token-path">{request.id}</span>
      </td>
      <td>
        {request.problem}
        {brief && <DesignBrief brief={brief} />}
      </td>
      <td>
        {request.expectedVariants.length > 0
          ? request.expectedVariants.map((v) => (
              <span key={v} className="badge">
                {v}
              </span>
            ))
          : "—"}
      </td>
      <td>{request.requestedBy}</td>
      <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
      <td>
        <RequestActions request={request} onViewComponent={onViewComponent} />
      </td>
    </tr>
  );
}

export interface RequestQueueHeading {
  kicker: string;
  title: string;
  lede: React.ReactNode;
}

export interface RequestQueueProps {
  /** Which statuses to show, in order. Defaults to every status (today's full queue). */
  statuses?: ComponentRequestStatus[];
  /** Whether to render the "file a new request" form. Defaults to true. */
  showForm?: boolean;
  prefill?: RequestFormPrefill;
  onViewComponent?: (id: string) => void;
  heading?: RequestQueueHeading;
}

const DEFAULT_HEADING: RequestQueueHeading = {
  kicker: "Pre-spec intake queue",
  title: "Component Requests",
  lede: (
    <>
      Every request filed via <code>ds request</code>, grouped by status.
    </>
  ),
};

export function RequestQueue({
  statuses = STATUS_ORDER,
  showForm = true,
  prefill,
  onViewComponent,
  heading = DEFAULT_HEADING,
}: RequestQueueProps) {
  const { entries, loading, error } = useRequestRegistry();
  const visible = entries.filter((e) => statuses.includes(e.request.status));

  return (
    <div>
      <div className="component-header">
        <span className="kicker">{heading.kicker}</span>
        <h1 className="display">{heading.title}</h1>
        <p className="lede">{heading.lede}</p>
      </div>

      {showForm && <RequestForm prefill={prefill} key={prefill?.id ?? "blank"} />}

      {loading ? (
        <p className="lede">Loading requests…</p>
      ) : error ? (
        <p className="ask-widget__answer ask-widget__answer--refused">{error}</p>
      ) : visible.length === 0 ? (
        <p className="lede">
          Nothing here yet. {showForm && <>Run <code>ds request new &lt;name&gt;</code> to file one, or use the form above.</>}
        </p>
      ) : (
        statuses.map((status) => {
          const entries = visible.filter((e) => e.request.status === status);
          if (entries.length === 0) return null;

          return (
            <section key={status} className="doc-section">
              <h2>
                {status} ({entries.length})
              </h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Problem</th>
                    <th>Expected variants</th>
                    <th>Requested by</th>
                    <th>Requested at</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <RequestRow key={entry.request.id} entry={entry} onViewComponent={onViewComponent} />
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}
