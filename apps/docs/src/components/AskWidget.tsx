import * as React from "react";

interface AskResponse {
  grounded: boolean;
  answer: string;
  citedComponent?: string;
}

type Status = "idle" | "loading" | "answered" | "error";

/**
 * Talks to the /api/ask Worker route only — never calls a model provider
 * directly, so no gateway credential ever needs to reach the browser. Only
 * live under `wrangler dev` / a real deploy, where the Worker actually
 * serves that route; under plain `vite dev` the fetch 404s, surfaced here
 * as a plain error state rather than a crash.
 */
export function AskWidget() {
  const [question, setQuestion] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [result, setResult] = React.useState<AskResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || status === "loading") return;

    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `request failed (${res.status})`);
      }
      const data = (await res.json()) as AskResponse;
      setResult(data);
      setStatus("answered");
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="ask-widget">
      <div className="ask-widget__label">Ask the docs</div>
      <form onSubmit={handleSubmit} className="ask-widget__form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What variants does Button support?"
          className="ask-widget__input"
          aria-label="Ask a question about this design system"
        />
        <button type="submit" className="ask-widget__submit" disabled={status === "loading"}>
          {status === "loading" ? "Asking…" : "Ask"}
        </button>
      </form>
      {status === "answered" && result && (
        <p className={`ask-widget__answer${result.grounded ? "" : " ask-widget__answer--refused"}`}>
          {result.answer}
        </p>
      )}
      {status === "error" && <p className="ask-widget__answer ask-widget__answer--refused">{errorMessage}</p>}
    </div>
  );
}
