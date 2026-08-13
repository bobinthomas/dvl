import * as React from "react";
import { CategorySchema } from "@ds-platform/core/schema";
import type { ComponentRequest } from "@ds-platform/core/request-schema";

type Status = "idle" | "loading" | "error";

/**
 * The brief is a pure function of a request's category/problem/notes/
 * expectedVariants (see request-schema.ts's buildDesignBrief) — there's no
 * freeform brief text to edit directly. This edits those inputs instead;
 * pair with re-running "Generate brief" to pick up the change.
 */
export function EditRequestForm({ request }: { request: ComponentRequest }) {
  const [category, setCategory] = React.useState(request.category);
  const [problem, setProblem] = React.useState(request.problem);
  const [notes, setNotes] = React.useState(request.notes ?? "");
  const [expectedVariants, setExpectedVariants] = React.useState(request.expectedVariants.join(", "));
  const [status, setStatus] = React.useState<Status>("idle");
  const [errors, setErrors] = React.useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setErrors([]);
    try {
      const res = await fetch(`/api/dev/requests/${request.id}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          problem,
          notes,
          expectedVariants: expectedVariants
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; errors?: string[] } | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStatus("error");
        return;
      }
      window.location.reload();
    } catch {
      setErrors(["Editing requests only works while running `pnpm dev` locally."]);
      setStatus("error");
    }
  }

  return (
    <details className="request-form">
      <summary>Edit request</summary>
      <form onSubmit={handleSubmit} className="request-form__fields">
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
        <button type="submit" className="ask-widget__submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving…" : "Save changes"}
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
