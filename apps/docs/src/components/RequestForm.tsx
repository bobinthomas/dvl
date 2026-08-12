import * as React from "react";
import { CategorySchema } from "@ds-platform/core/schema";
import { useSimulation } from "../simulationContext.js";
import { useProviderSettings } from "../providerContext.js";
import { safeConfirm } from "../safeConfirm.js";

type Status = "idle" | "loading" | "error";

interface ApiResponse {
  ok: boolean;
  id?: string;
  errors?: string[];
}

interface GenerateResponse {
  ok: boolean;
  problem?: string;
  notes?: string;
  expectedVariants?: string[];
  errors?: string[];
}

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Posts to /api/dev/requests, a route that only exists under plain
 * `vite dev` (see vite.config.ts's requestsDevApiPlugin) — never under
 * `wrangler dev` or a deployed site, since a Worker can't write git-tracked
 * files. Same graceful-degradation posture AskWidget.tsx uses for /api/ask,
 * just for the opposite runtime.
 */
export interface RequestFormPrefill {
  id?: string;
  problem?: string;
}

export function RequestForm({ prefill }: { prefill?: RequestFormPrefill }) {
  const { simulate } = useSimulation();
  const { providerConfig, gatewayConfig } = useProviderSettings();
  const [id, setId] = React.useState(prefill?.id ?? "");
  const [category, setCategory] = React.useState(CategorySchema.options[0]);
  const [problem, setProblem] = React.useState(prefill?.problem ?? "");
  const [notes, setNotes] = React.useState("");
  const [expectedVariants, setExpectedVariants] = React.useState("");
  const [requestedBy, setRequestedBy] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [hint, setHint] = React.useState("");
  const [genStatus, setGenStatus] = React.useState<Status>("idle");
  const [genErrors, setGenErrors] = React.useState<string[]>([]);

  async function handleGenerate() {
    if (genStatus === "loading") return;
    if (
      (problem.trim() || notes.trim() || expectedVariants.trim()) &&
      !safeConfirm("This will overwrite the problem, notes, and expected variants fields. Continue?")
    ) {
      return;
    }
    setGenStatus("loading");
    setGenErrors([]);
    try {
      const res = await fetch("/api/dev/requests/generate-content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: id || undefined, category, hint, simulate, providerConfig, gatewayConfig }),
      });
      const data = (await res.json().catch(() => null)) as GenerateResponse | null;
      if (!res.ok || !data?.ok) {
        setGenErrors(data?.errors ?? [`request failed (${res.status})`]);
        setGenStatus("error");
        return;
      }
      setProblem(data.problem ?? "");
      setNotes(data.notes ?? "");
      setExpectedVariants((data.expectedVariants ?? []).join(", "));
      setGenStatus("idle");
    } catch {
      setGenErrors(["Generating with AI only works while running `pnpm dev` locally."]);
      setGenStatus("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    if (!KEBAB_CASE.test(id)) {
      setStatus("error");
      setErrors(['Component id must be kebab-case, e.g. "date-picker".']);
      return;
    }

    setStatus("loading");
    setErrors([]);
    try {
      const res = await fetch("/api/dev/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: id,
          category,
          problem,
          notes,
          expectedVariants: expectedVariants
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0),
          requestedBy,
        }),
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStatus("error");
        return;
      }

      window.location.reload();
    } catch {
      setErrors(["Filing requests from the browser only works while running `pnpm dev` locally."]);
      setStatus("error");
    }
  }

  return (
    <details className="request-form" open={prefill !== undefined || undefined}>
      <summary>File a new request</summary>
      <form onSubmit={handleSubmit} className="request-form__fields">
        <label className="form-field">
          Component id (kebab-case)
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="date-picker"
            required
          />
        </label>
        <label className="form-field">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            {CategorySchema.options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="generate-with-ai">
          <label className="form-field">
            Idea (optional)
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. filtering a product list by more than one attribute"
            />
          </label>
          <button type="button" className="generate-with-ai__button" onClick={handleGenerate} disabled={genStatus === "loading"}>
            {genStatus === "loading" ? "Generating…" : "Generate with AI"}
          </button>
          {genStatus === "error" &&
            genErrors.map((err) => (
              <p key={err} className="ask-widget__answer ask-widget__answer--refused">
                {err}
              </p>
            ))}
        </div>
        <label className="form-field">
          What need does this component fill?
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} required rows={2} />
        </label>
        <label className="form-field">
          Notes (optional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        <label className="form-field">
          Expected variants, comma-separated (optional)
          <input
            type="text"
            value={expectedVariants}
            onChange={(e) => setExpectedVariants(e.target.value)}
            placeholder="single, range"
          />
        </label>
        <label className="form-field">
          Requested by
          <input type="text" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} required />
        </label>
        <button type="submit" className="ask-widget__submit" disabled={status === "loading"}>
          {status === "loading" ? "Filing…" : "File request"}
        </button>
        {status === "error" &&
          errors.map((err) => (
            <p key={err} className="ask-widget__answer ask-widget__answer--refused">
              {err}
            </p>
          ))}
      </form>
    </details>
  );
}
