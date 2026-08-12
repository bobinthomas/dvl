import * as React from "react";
import type { ComponentRequest } from "@ds-platform/core/request-schema";
import { PromoteForm } from "./PromoteForm.js";
import { useSimulation } from "../simulationContext.js";
import { useProviderSettings } from "../providerContext.js";

type Status = "idle" | "loading" | "error";

interface ActionResponse {
  ok: boolean;
  errors?: string[];
  report?: { ok: boolean; matched: string[]; missing: string[]; issues: string[] };
}

async function postJson(url: string, body?: unknown): Promise<ActionResponse> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as ActionResponse | null;
    if (!res.ok || !data?.ok) {
      return { ok: false, errors: data?.errors ?? [`request failed (${res.status})`] };
    }
    return data;
  } catch {
    return { ok: false, errors: ["This action only works while running `pnpm dev` locally."] };
  }
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <>
      {errors.map((err) => (
        <p key={err} className="ask-widget__answer ask-widget__answer--refused">
          {err}
        </p>
      ))}
    </>
  );
}

/**
 * One action per request status — the browser-driven equivalent of
 * `ds request approve/brief/verify` and `ds new --from-request`. Every
 * mutating action reloads the page on success (same pattern RequestForm.tsx
 * already uses) so the row picks up its new status from requestRegistry.
 */
export function RequestActions({
  request,
  onViewComponent,
}: {
  request: ComponentRequest;
  onViewComponent?: (id: string) => void;
}) {
  const { simulate } = useSimulation();
  const { figmaConfig } = useProviderSettings();
  const [status, setStatus] = React.useState<Status>("idle");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [figmaFileKey, setFigmaFileKey] = React.useState(request.figmaFileKey ?? "");
  const [verifyReport, setVerifyReport] = React.useState<ActionResponse["report"] | null>(null);

  async function runSimpleAction(url: string) {
    setStatus("loading");
    setErrors([]);
    const data = await postJson(url);
    if (!data.ok) {
      setErrors(data.errors ?? ["unknown error"]);
      setStatus("error");
      return;
    }
    window.location.reload();
  }

  if (request.status === "pending") {
    return (
      <div>
        <button
          type="button"
          className="ask-widget__submit"
          disabled={status === "loading"}
          onClick={() => runSimpleAction(`/api/dev/requests/${request.id}/approve`)}
        >
          {status === "loading" ? "Approving…" : "Approve"}
        </button>
        <ErrorList errors={errors} />
      </div>
    );
  }

  if (request.status === "approved") {
    return (
      <div>
        <button
          type="button"
          className="ask-widget__submit"
          disabled={status === "loading"}
          onClick={() => runSimpleAction(`/api/dev/requests/${request.id}/brief`)}
        >
          {status === "loading" ? "Generating…" : "Generate brief"}
        </button>
        <ErrorList errors={errors} />
      </div>
    );
  }

  if (request.status === "in-design") {
    return (
      <div className="request-actions__verify">
        <input
          type="text"
          value={figmaFileKey}
          onChange={(e) => setFigmaFileKey(e.target.value)}
          placeholder="Figma file key"
        />
        <button
          type="button"
          className="ask-widget__submit"
          disabled={status === "loading"}
          onClick={async () => {
            setStatus("loading");
            setErrors([]);
            setVerifyReport(null);
            const data = await postJson(`/api/dev/requests/${request.id}/verify`, {
              figmaFileKey: figmaFileKey || undefined,
              simulate,
              figmaConfig,
            });
            if (!data.ok) {
              setErrors(data.errors ?? ["unknown error"]);
              setStatus("error");
              return;
            }
            setVerifyReport(data.report ?? null);
            setStatus("idle");
            if (data.report?.ok) window.location.reload();
          }}
        >
          {status === "loading" ? "Verifying…" : "Verify"}
        </button>
        <ErrorList errors={errors} />
        {verifyReport && !verifyReport.ok && (
          <div>
            <p>matched: {verifyReport.matched.join(", ") || "(none)"}</p>
            {verifyReport.issues.map((issue) => (
              <p key={issue} className="ask-widget__answer ask-widget__answer--refused">
                {issue}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (request.status === "ready-for-verification") {
    return <PromoteForm requestId={request.id} onViewComponent={onViewComponent} />;
  }

  if (request.status === "promoted" && request.promotedSpecId && onViewComponent) {
    return (
      <button
        type="button"
        className="ask-widget__submit"
        onClick={() => onViewComponent(request.promotedSpecId!)}
      >
        View component →
      </button>
    );
  }

  return null;
}
