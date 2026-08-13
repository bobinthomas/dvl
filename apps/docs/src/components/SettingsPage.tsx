import * as React from "react";
import { CategorySchema } from "@ds-platform/core/schema";
import { PROVIDER_INFO, useProviderSettings, type DirectProvider } from "../providerContext.js";
import { useStandingQuestions } from "../standingQuestionsContext.js";
import { useStandingBriefConfig } from "../standingBriefContext.js";

interface EnvStatusResponse {
  ok: boolean;
  gateway?: { accountId: boolean; gatewayId: boolean; token: boolean; model: boolean };
  figma?: { accessToken: boolean };
}

type EnvStatus = "loading" | "unavailable" | EnvStatusResponse;

/**
 * Every credential the docs app's UI can supply in place of a
 * .env.local/.dev.vars value, in one place — so "why is this still failing"
 * has a single screen to check instead of hunting across three forms.
 * Priority order (see dev-server/resolve-client.ts) is always: what's typed
 * here first, then this machine's own env vars. The status line under each
 * section reflects that same order, combining what's in this browser
 * (providerConfig/gatewayConfig/figmaConfig) with what's on the server
 * (fetched once from /api/dev/env-status — booleans only, never values).
 */
export function SettingsPage() {
  const {
    provider,
    apiKey,
    model,
    setProvider,
    setApiKey,
    setModel,
    gatewayAccountId,
    gatewayGatewayId,
    gatewayToken,
    gatewayModel,
    setGatewayAccountId,
    setGatewayGatewayId,
    setGatewayToken,
    setGatewayModel,
    figmaAccessToken,
    setFigmaAccessToken,
    providerConfig,
    gatewayConfig,
    figmaConfig,
  } = useProviderSettings();

  const [envStatus, setEnvStatus] = React.useState<EnvStatus>("loading");

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/env-status", { method: "POST" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`request failed (${res.status})`))))
      .then((data: EnvStatusResponse) => {
        if (!cancelled) setEnvStatus(data);
      })
      .catch(() => {
        if (!cancelled) setEnvStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const gatewayEnvReady =
    envStatus !== "loading" &&
    envStatus !== "unavailable" &&
    !!envStatus.gateway?.accountId &&
    !!envStatus.gateway?.gatewayId &&
    !!envStatus.gateway?.token &&
    !!envStatus.gateway?.model;
  const figmaEnvReady =
    envStatus !== "loading" && envStatus !== "unavailable" && !!envStatus.figma?.accessToken;

  let aiSummary: string;
  if (providerConfig) aiSummary = `Using ${PROVIDER_INFO[providerConfig.provider].label} (configured below).`;
  else if (gatewayConfig) aiSummary = "Using Cloudflare AI Gateway (configured below).";
  else if (gatewayEnvReady) aiSummary = "Using Cloudflare AI Gateway (this machine's apps/docs/.env.local).";
  else if (envStatus === "loading") aiSummary = "Checking what's already configured…";
  else aiSummary = "Not configured yet — every \"Generate with AI\" action will fail until one path below is filled in.";

  let figmaSummary: string;
  if (figmaConfig) figmaSummary = "Using the Figma token configured below.";
  else if (figmaEnvReady) figmaSummary = "Using this machine's FIGMA_ACCESS_TOKEN (apps/docs/.env.local).";
  else if (envStatus === "loading") figmaSummary = "Checking what's already configured…";
  else figmaSummary = "Not configured — real (non-simulated) Verify checks will fail until this is filled in.";

  return (
    <div>
      <div className="component-header">
        <span className="kicker">Settings</span>
        <h1 className="display">AI &amp; Figma credentials</h1>
        <p className="lede">
          Everything here is stored only in this browser's localStorage and sent straight from the local dev
          server to the provider — never to an env file, never committed. Leave everything blank to keep using
          Simulation mode or this machine's own env vars.
        </p>
      </div>

      <section className="doc-section">
        <h2>AI generation</h2>
        <p className="settings-summary">{aiSummary}</p>

        <h3>Direct provider</h3>
        <div className="request-form__fields">
          <label className="form-field">
            Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value as DirectProvider)}>
              {(Object.keys(PROVIDER_INFO) as DirectProvider[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_INFO[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="paste your key"
              autoComplete="off"
            />
          </label>
          <label className="form-field">
            Model
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDER_INFO[provider].modelPlaceholder}
            />
            <span className="settings-hint">
              Leave blank to use the placeholder above ({PROVIDER_INFO[provider].modelPlaceholder}).
            </span>
          </label>
        </div>

        <h3>Cloudflare AI Gateway</h3>
        <p className="settings-hint">Only used if no direct-provider key above is set.</p>
        <div className="request-form__fields">
          <label className="form-field">
            Account ID
            <input type="text" value={gatewayAccountId} onChange={(e) => setGatewayAccountId(e.target.value)} />
          </label>
          <label className="form-field">
            Gateway ID
            <input type="text" value={gatewayGatewayId} onChange={(e) => setGatewayGatewayId(e.target.value)} />
          </label>
          <label className="form-field">
            API token
            <input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="form-field">
            Model
            <input
              type="text"
              value={gatewayModel}
              onChange={(e) => setGatewayModel(e.target.value)}
              placeholder="workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
            />
          </label>
        </div>
        <p className="settings-hint">
          Server has: account id {statusMark(envStatus, "accountId")}, gateway id {statusMark(envStatus, "gatewayId")},
          token {statusMark(envStatus, "token")}, model {statusMark(envStatus, "model")} (from apps/docs/.env.local).
        </p>
      </section>

      <section className="doc-section">
        <h2>Figma verification</h2>
        <p className="settings-summary">{figmaSummary}</p>
        <div className="request-form__fields">
          <label className="form-field">
            Figma access token
            <input
              type="password"
              value={figmaAccessToken}
              onChange={(e) => setFigmaAccessToken(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
        <p className="settings-hint">
          Server has: access token{" "}
          {envStatus === "loading" ? "…" : envStatus === "unavailable" ? "unknown" : figmaEnvReady ? "✓ set" : "✗ not set"}{" "}
          (from apps/docs/.env.local).
        </p>
      </section>

      <StandingQuestionsSection />
      <StandingBriefSection />
    </div>
  );
}

function statusMark(envStatus: EnvStatus, key: "accountId" | "gatewayId" | "token" | "model"): string {
  if (envStatus === "loading") return "…";
  if (envStatus === "unavailable") return "unknown";
  return envStatus.gateway?.[key] ? "✓ set" : "✗ not set";
}

/**
 * A standing baseline of questions asked first in every promote-step
 * interview, before whatever the AI generates for that specific PRD (see
 * mergeStandingQuestions in @ds-platform/agents). Global — one list for
 * every component, not per-category.
 */
function StandingQuestionsSection() {
  const { questions, addQuestion, removeQuestion } = useStandingQuestions();
  const [prompt, setPrompt] = React.useState("");
  const [why, setWhy] = React.useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    addQuestion(prompt, why);
    setPrompt("");
    setWhy("");
  }

  return (
    <section className="doc-section">
      <h2>Interview questions</h2>
      <p className="settings-summary">
        {questions.length === 0
          ? "No standing questions yet — every promote interview is entirely AI-generated."
          : `${questions.length} standing question${questions.length === 1 ? "" : "s"}, asked first in every promote interview, before the AI's own questions for that component.`}
      </p>

      {questions.length > 0 && (
        <ul className="standing-questions__list">
          {questions.map((q) => (
            <li key={q.id} className="standing-questions__item">
              <div>
                <strong>{q.prompt}</strong>
                {q.why && <p className="settings-hint">{q.why}</p>}
              </div>
              <button
                type="button"
                className="standing-questions__remove"
                onClick={() => removeQuestion(q.id)}
                aria-label={`Remove question: ${q.prompt}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="request-form__fields">
        <label className="form-field">
          Question
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="e.g. Does this need a loading state?"
          />
        </label>
        <label className="form-field">
          Why (optional)
          <input
            type="text"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="e.g. asynchronous data is common in this product"
          />
        </label>
        <button type="submit" className="ask-widget__submit" disabled={!prompt.trim()}>
          Add question
        </button>
      </form>
    </section>
  );
}

/**
 * A team-wide baseline for the generated design brief's boilerplate — set
 * once here instead of hand-edited into every brief (see
 * standingBriefContext.tsx and request-schema.ts's buildDesignBrief).
 * Blank fields fall back to buildDesignBrief's own defaults, so leaving
 * everything empty reproduces today's behavior exactly.
 */
function StandingBriefSection() {
  const { config, setGuidelines, setDefaultReferenceExample, setCategoryReferenceExample } = useStandingBriefConfig();
  const [guidelinesText, setGuidelinesText] = React.useState((config.guidelines ?? []).join("\n"));

  function commitGuidelines() {
    setGuidelines(
      guidelinesText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    );
  }

  return (
    <section className="doc-section">
      <h2>Design brief template</h2>
      <p className="settings-summary">
        Customize the boilerplate every generated design brief includes — leave a field blank to use the built-in
        default.
      </p>

      <label className="form-field">
        Design system guidelines (one per line)
        <textarea
          value={guidelinesText}
          onChange={(e) => setGuidelinesText(e.target.value)}
          onBlur={commitGuidelines}
          rows={5}
          placeholder="(default: token usage, anatomy naming, interaction states, accessibility requirements)"
        />
      </label>

      <label className="form-field">
        Default reference example (component id)
        <input
          type="text"
          value={config.defaultReferenceExample ?? ""}
          onChange={(e) => setDefaultReferenceExample(e.target.value)}
          placeholder="button"
        />
      </label>

      <div className="form-field">
        Reference example by category (optional — overrides the default above for that category)
        {CategorySchema.options.map((category) => (
          <label key={category} className="form-field">
            {category}
            <input
              type="text"
              value={config.referenceExamplesByCategory?.[category] ?? ""}
              onChange={(e) => setCategoryReferenceExample(category, e.target.value)}
              placeholder={config.defaultReferenceExample || "button"}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
