import * as React from "react";
import { useSimulation } from "../simulationContext.js";
import { useProviderSettings } from "../providerContext.js";
import { useStandingQuestions } from "../standingQuestionsContext.js";

interface InterviewQuestion {
  id: string;
  prompt: string;
  why: string;
}

interface SuggestAnswerResponse {
  ok: boolean;
  answer?: string;
  errors?: string[];
}

type Step = "idle" | "loading-questions" | "answering" | "submitting" | "error" | "built-with-issues";

/**
 * `ds new --from-request <id>`, over HTTP, as a two-step form: fetch the
 * model-generated interview questions, render them, submit the answers to
 * draft and write the spec — then, since the dev API also runs the real
 * `ds build` pipeline (see dev-server/api.ts's handlePromoteDraft), either
 * hand off to `onViewComponent` on success or surface the build issue
 * before reloading. Same runtime-scoped-route posture as every other form
 * in this app.
 */
export function PromoteForm({
  requestId,
  onViewComponent,
}: {
  requestId: string;
  onViewComponent?: (id: string) => void;
}) {
  const { simulate } = useSimulation();
  const { providerConfig, gatewayConfig } = useProviderSettings();
  const { questions: standingQuestions } = useStandingQuestions();
  const [step, setStep] = React.useState<Step>("idle");
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<string[]>([]);
  const [suggestingId, setSuggestingId] = React.useState<string | null>(null);

  async function suggestAnswer(question: InterviewQuestion) {
    if (suggestingId) return;
    setSuggestingId(question.id);
    setErrors([]);
    try {
      const res = await fetch(`/api/dev/requests/${requestId}/promote/suggest-answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          otherQuestions: questions.filter((q) => q.id !== question.id),
          simulate,
          providerConfig,
          gatewayConfig,
        }),
      });
      const data = (await res.json().catch(() => null)) as SuggestAnswerResponse | null;
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        return;
      }
      setAnswers((a) => ({ ...a, [question.id]: data.answer ?? "" }));
    } catch {
      setErrors(["Generating with AI only works while running `pnpm dev` locally."]);
    } finally {
      setSuggestingId(null);
    }
  }

  async function startPromotion() {
    setStep("loading-questions");
    setErrors([]);
    try {
      const res = await fetch(`/api/dev/requests/${requestId}/promote/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ simulate, providerConfig, gatewayConfig, standingQuestions }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStep("error");
        return;
      }
      setQuestions(data.questions ?? []);
      setAnswers({});
      setStep("answering");
    } catch {
      setErrors(["Promotion only works while running `pnpm dev` locally, with AI Gateway credentials set."]);
      setStep("error");
    }
  }

  async function submitAnswers(e: React.FormEvent) {
    e.preventDefault();
    setStep("submitting");
    setErrors([]);
    try {
      const res = await fetch(`/api/dev/requests/${requestId}/promote/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, simulate, providerConfig, gatewayConfig }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErrors(data?.errors ?? [`request failed (${res.status})`]);
        setStep("error");
        return;
      }
      if (!data.built) {
        setStep("built-with-issues");
        return;
      }
      if (onViewComponent) {
        onViewComponent(requestId);
      } else {
        window.location.reload();
      }
    } catch {
      setErrors(["Promotion only works while running `pnpm dev` locally, with AI Gateway credentials set."]);
      setStep("error");
    }
  }

  if (step === "built-with-issues") {
    return (
      <div>
        <p className="ask-widget__answer ask-widget__answer--refused">
          Spec drafted and the request is promoted, but code generation hit an issue — check it with{" "}
          <code>ds build {requestId}</code> from the CLI.
        </p>
        <button type="button" className="ask-widget__submit" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }

  if (step === "idle" || step === "error") {
    return (
      <div>
        <button type="button" className="ask-widget__submit" onClick={startPromotion}>
          Promote to spec
        </button>
        {errors.map((err) => (
          <p key={err} className="ask-widget__answer ask-widget__answer--refused">
            {err}
          </p>
        ))}
      </div>
    );
  }

  if (step === "loading-questions") {
    return <p className="lede">Generating interview questions…</p>;
  }

  return (
    <form onSubmit={submitAnswers} className="promote-form">
      {questions.map((q) => (
        <div key={q.id} className="generate-with-ai generate-with-ai--inline">
          <label className="form-field">
            {q.prompt}
            <span className="promote-form__why">{q.why}</span>
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              rows={2}
              required
            />
          </label>
          <button
            type="button"
            className="generate-with-ai__button"
            onClick={() => suggestAnswer(q)}
            disabled={suggestingId !== null}
          >
            {suggestingId === q.id ? "Suggesting…" : "Suggest an answer"}
          </button>
        </div>
      ))}
      <button type="submit" className="ask-widget__submit" disabled={step === "submitting"}>
        {step === "submitting" ? "Drafting…" : "Draft spec"}
      </button>
      {errors.map((err) => (
        <p key={err} className="ask-widget__answer ask-widget__answer--refused">
          {err}
        </p>
      ))}
    </form>
  );
}
