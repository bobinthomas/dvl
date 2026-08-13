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

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * The brief's actual prose, directly editable — a plain textarea saved
 * verbatim via /brief/save, no template involved. Doesn't reload the page
 * on save (unlike every other mutating action here): there's no derived
 * state elsewhere on the page that depends on the brief text, and reloading
 * mid-edit of a long textarea would just be disruptive.
 */
function DesignBrief({ requestId, brief }: { requestId: string; brief: string }) {
  const [text, setText] = React.useState(brief);
  const [copied, setCopied] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [errors, setErrors] = React.useState<string[]>([]);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    setSaveStatus("saving");
    setErrors([]);
    try {
      const res = await fetch(`/api/dev/requests/${requestId}/brief/save`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: text }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; errors?: string[] } | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setErrors(["Saving a brief only works while running `pnpm dev` locally."]);
      setSaveStatus("error");
    }
  }

  const dirty = text !== brief;

  return (
    <details open>
      <summary>Design brief</summary>
      <div className="code-tabs__nav">
        <button type="button" className="copy-button" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="copy-button" onClick={handleSave} disabled={!dirty || saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
        </button>
      </div>
      <textarea
        className="code-block"
        style={{ whiteSpace: "pre-wrap", width: "100%", minHeight: "16rem" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {saveStatus === "error" &&
        errors.map((err) => (
          <p key={err} className="ask-widget__answer ask-widget__answer--refused">
            {err}
          </p>
        ))}
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
        {brief && <DesignBrief requestId={request.id} brief={brief} />}
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
