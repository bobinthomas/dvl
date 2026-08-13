import * as React from "react";
import type { ComponentRequest } from "@ds-platform/core/request-schema";
import { useSimulation } from "../simulationContext.js";

type JobStatus = "queued" | "building" | "built" | "verified" | "failed";

interface ReconciliationReport {
  ok: boolean;
  matched: string[];
  missing: string[];
  issues: string[];
}

interface JobResult {
  fileKey?: string;
  nodeId?: string;
  componentSetId?: string;
  variantKeys?: string[];
  reconciliation?: ReconciliationReport;
  error?: string;
}

interface JobPayload {
  id: string;
  status: "pending" | "claimed" | "done" | "failed";
  result?: JobResult;
}

interface CreateResponse {
  ok: boolean;
  jobId?: string;
  status?: string;
  job?: JobPayload;
  errors?: string[];
}

interface GetResponse {
  ok: boolean;
  job?: JobPayload;
  errors?: string[];
}

const POLL_INTERVAL_MS = 3000;

function toUiStatus(job: JobPayload): JobStatus {
  if (job.status === "pending") return "queued";
  if (job.status === "claimed") return "building";
  if (job.status === "failed") return "failed";
  return job.result?.reconciliation?.ok ? "verified" : "built";
}

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Queued — open the plugin in Figma to build it",
  building: "Building in Figma…",
  built: "Built — not yet verified",
  verified: "Verified ✓",
  failed: "Failed",
};

/**
 * "Send to Figma" — files a build job (see /api/figma/jobs) and polls its
 * status until the plugin (packages/figma-plugin) builds the component and
 * calls back. No fileKey to paste: the callback sets it, then runs
 * reconciliation automatically (see worker/dev-api.ts's completeJob) — the
 * same manual paste-fileKey-then-Verify flow below this still works as a
 * fallback for a component built without the plugin.
 */
export function SendToFigma({ request }: { request: ComponentRequest }) {
  const { simulate } = useSimulation();
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<JobStatus | null>(null);
  const [result, setResult] = React.useState<JobResult | undefined>();
  const [errors, setErrors] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  function applyJob(job: JobPayload) {
    setJobId(job.id);
    setStatus(toUiStatus(job));
    setResult(job.result);
    if (job.status === "done" && job.result?.reconciliation?.ok) {
      window.location.reload();
    }
  }

  async function send() {
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/figma/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: request.id, simulate }),
      });
      const data = (await res.json().catch(() => null)) as CreateResponse | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        return;
      }
      if (data.job) {
        applyJob(data.job);
      } else if (data.jobId) {
        setJobId(data.jobId);
        setStatus("queued");
      }
    } catch {
      setErrors(["Sending to Figma only works while running `pnpm dev` locally or against the deployed site."]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!jobId || status === "verified" || status === "failed") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/figma/jobs/${jobId}`);
        const data = (await res.json().catch(() => null)) as GetResponse | null;
        if (data?.ok && data.job) applyJob(data.job);
      } catch {
        // transient — the next tick retries
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyJob is stable enough for a poll interval
  }, [jobId, status]);

  if (!jobId) {
    return (
      <div className="send-to-figma">
        <button type="button" className="ask-widget__submit" onClick={send} disabled={loading}>
          {loading ? "Sending…" : "Send to Figma"}
        </button>
        {errors.map((err) => (
          <p key={err} className="ask-widget__answer ask-widget__answer--refused">
            {err}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="send-to-figma">
      <p className="send-to-figma__status">{STATUS_LABEL[status ?? "queued"]}</p>
      {(status === "queued" || status === "building") && !simulate && (
        <p className="settings-hint">
          Open Figma, run the "Design System Builder" plugin, and pick "{request.name}" from its job list (job id:{" "}
          <code className="token-path">{jobId}</code>).
        </p>
      )}
      {result?.fileKey && result?.nodeId && (
        <p>
          <a
            href={`https://www.figma.com/design/${result.fileKey}/${encodeURIComponent(request.name)}?node-id=${result.nodeId}`}
            target="_blank"
            rel="noreferrer"
          >
            View in Figma →
          </a>
        </p>
      )}
      {result?.reconciliation && !result.reconciliation.ok && (
        <div>
          <p className="settings-hint">matched: {result.reconciliation.matched.join(", ") || "(none)"}</p>
          {result.reconciliation.issues.map((issue) => (
            <p key={issue} className="ask-widget__answer ask-widget__answer--refused">
              {issue}
            </p>
          ))}
        </div>
      )}
      {result?.error && <p className="ask-widget__answer ask-widget__answer--refused">{result.error}</p>}
      {errors.map((err) => (
        <p key={err} className="ask-widget__answer ask-widget__answer--refused">
          {err}
        </p>
      ))}
    </div>
  );
}
