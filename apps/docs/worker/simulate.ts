import type { GapReport, DocQuality, InterviewQuestion, RequestContentDraft, SamplePrd, SuggestedAnswer } from "@ds-platform/agents";
import type { ComponentRequest, ComponentSpec } from "@ds-platform/core";
import type { ReconciliationReport } from "@ds-platform/figma-client";

/**
 * A duplicate of dev-server/simulate.ts, not an import of it — that file
 * belongs to apps/docs/tsconfig.json's project (rootDir apps/docs), and
 * `worker/tsconfig.json` is a deliberately separate composite project
 * (different types: @cloudflare/workers-types, no DOM lib) rooted at
 * apps/docs/worker. Reaching across that boundary via an explicit `include`
 * entry made `tsc -b` emit compiled .js/.d.ts files straight into
 * dev-server/ alongside its source — worse than this small duplication. If
 * the canned "simulation mode" responses change, update both copies.
 *
 * "Simulation mode" — canned, schema-valid responses standing in for the
 * AI Gateway / Figma REST calls, so the whole wizard is clickable with zero
 * API keys. Deliberately handler-level, not a fake ModelClient/FigmaClient:
 * simulateComponentSpec needs to produce a spec whose id matches the exact
 * request being promoted, which a client-level fake could only recover by
 * parsing prompt text. Every caller here already has the real, typed
 * request/spec in scope, so it's simpler and more robust to branch there
 * instead. Every string below is prefixed "(simulated)" so this can never
 * be mistaken for real model/Figma output.
 */

export function simulateGapReport(specs: ComponentSpec[]): GapReport {
  const components: GapReport["components"] = [];
  if (specs.length > 0) {
    const s = specs[0];
    components.push({
      id: s.id,
      name: s.name,
      classification: "have",
      evidence: `(simulated) matched the existing "${s.name}" spec in your inventory.`,
      missing: [],
    });
  }
  components.push({
    id: "example-widget",
    name: "ExampleWidget",
    classification: "missing",
    evidence: "(simulated) a stand-in gap — turn simulation off for a real PRD read.",
    missing: [],
  });
  return { components };
}

export function simulateDocQuality(spec: ComponentSpec): DocQuality {
  if (spec.accessibility.requirements.length === 0) {
    return {
      rating: "needs-improvement",
      issues: ["(simulated) no accessibility requirements are recorded on this spec."],
    };
  }
  return { rating: "adequate", issues: [] };
}

export function simulateInterviewQuestions(): { questions: InterviewQuestion[] } {
  return {
    questions: [
      {
        id: "intent",
        prompt: "When should this component be used, and when should it not be?",
        why: "(simulated) a stand-in question — turn simulation off for a real interview.",
      },
      {
        id: "edge_cases",
        prompt: "Are there invalid prop/state combinations to rule out?",
        why: "(simulated) helps define invalidCombinations.",
      },
    ],
  };
}

export function simulateComponentSpec(request: ComponentRequest): ComponentSpec {
  return {
    id: request.id,
    name: request.name,
    category: request.category,
    status: "draft",
    version: "0.1.0",
    owner: "@ds-lead",
    description: `(simulated draft) ${request.problem}`,
    anatomy: { root: "div element", parts: [] },
    props: [
      {
        name: "onAction",
        type: "function",
        description: "Callback fired when the component is activated.",
        required: true,
        platforms: ["react", "react-native"],
      },
    ],
    states: ["default"],
    invalidCombinations: [],
    tokens: [],
    accessibility: {
      role: "group",
      keyboard: {},
      aria: [],
      contrast: [],
      requirements: ["(simulated) add real accessibility requirements before shipping."],
    },
    examples: [{ name: "Default", props: {}, state: "default" }],
    overrides: { imports: [] },
  };
}

export function simulateFigmaReconciliation(request: ComponentRequest): ReconciliationReport {
  return { ok: true, matched: request.expectedVariants, missing: [], issues: [] };
}

export function simulateRequestContent(input: { name?: string; category: string }): RequestContentDraft {
  const label = input.name ?? "this component";
  return {
    problem: `(simulated) Customers need a consistent way to handle "${label}" in the ${input.category} category — turn simulation off for a real draft.`,
    notes: "(simulated) a stand-in note — turn simulation off for a real draft.",
    expectedVariants: ["default", "compact"],
  };
}

export function simulateSamplePrd(): SamplePrd {
  return {
    prdText: `# (simulated) Sample PRD\n\n## Problem\n\nCustomers can't schedule a pickup window without calling support — turn simulation off for a real generated PRD.\n\n## Requirements\n\n- The customer picks a date and a time window from the next 7 available days.\n- The customer can cancel or reschedule an existing pickup.`,
  };
}

export function simulateSuggestedAnswer(): SuggestedAnswer {
  return { answer: "(simulated) a stand-in answer — turn simulation off for a real suggestion." };
}
