import { z } from "zod";
import type { ComponentSpec } from "@ds-platform/core";
import { callModel } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

export const ComponentGapSchema = z.object({
  id: z.string().describe('Suggested kebab-case id for the component, e.g. "date-picker".'),
  name: z.string().describe('Suggested PascalCase name, e.g. "DatePicker".'),
  classification: z.enum(["have", "partial", "missing"]),
  evidence: z
    .string()
    .describe("A line or close paraphrase from the PRD that implies this component is needed."),
  missing: z
    .array(z.string())
    .default([])
    .describe('For "partial" only: specifically what the existing spec lacks for this PRD\'s needs.'),
});
export type ComponentGap = z.infer<typeof ComponentGapSchema>;

export const GapReportSchema = z.object({
  components: z.array(ComponentGapSchema),
});
export type GapReport = z.infer<typeof GapReportSchema>;

function summarizeSpec(spec: ComponentSpec): string {
  const variants = spec.props
    .filter((p) => p.type === "enum")
    .map((p) => `${p.name}=[${(p.values ?? []).join("|")}]`)
    .join(", ");
  return `- id: ${spec.id}, name: ${spec.name}, category: ${spec.category}, status: ${spec.status}\n  description: ${spec.description}\n  variant props: ${variants || "(none)"}\n  states: ${spec.states.join(", ")}`;
}

const SYSTEM_PROMPT = `You are a design-systems analyst. Given a product PRD and an inventory of the
design system's existing component specs, identify every reusable UI component the PRD implies is
needed, and classify each against the existing inventory:

- "have": an existing spec already covers this need as described in the PRD.
- "partial": an existing spec covers the general component, but the PRD describes a need the spec
  doesn't declare (a missing variant, state, or prop) — list exactly what's missing.
- "missing": no existing spec covers this at all.

Only identify reusable UI components (buttons, pickers, cards, badges, dialogs, chips) — not whole
screens, flows, or business logic. For each, quote or closely paraphrase the PRD line that implies it
as evidence. Be conservative: if the PRD's language doesn't clearly imply a distinct reusable
component, don't invent one.`;

/**
 * Compares a PRD against the real specs in components/ — never a cached or
 * hand-maintained inventory, so the report can't drift from what's actually
 * built. The model does the reading-comprehension work of matching PRD
 * language to component needs; classification and evidence are then
 * validated against GapReportSchema like every other model response.
 */
export async function runGapAnalysis(
  client: ModelClient,
  model: string,
  prdText: string,
  existingSpecs: ComponentSpec[]
): Promise<GapReport> {
  const inventory =
    existingSpecs.length > 0
      ? existingSpecs.map(summarizeSpec).join("\n")
      : "(the component inventory is currently empty — everything the PRD implies is missing)";

  return callModel(client, model, {
    schema: GapReportSchema,
    schemaName: "gap_report",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `PRD:\n\n${prdText}\n\n---\n\nExisting component inventory:\n\n${inventory}`,
      },
    ],
  });
}
