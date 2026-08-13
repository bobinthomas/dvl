import { z } from "zod";
import { CategorySchema, ComponentSpecSchema, type ComponentSpec } from "./schema.js";

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * A component request's lifecycle, from first intake through promotion into
 * a real spec. Deliberately a separate entity from ComponentSpecSchema — a
 * request precedes a spec existing at all, so it has no version to diff and
 * never participates in the sync gate, validator, or changelog gate.
 */
export const ComponentRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "in-design",
  "ready-for-verification",
  "promoted",
  "rejected",
]);
export type ComponentRequestStatus = z.infer<typeof ComponentRequestStatusSchema>;

export const ComponentRequestSchema = z.object({
  id: z.string().regex(KEBAB_CASE, 'id must be kebab-case, e.g. "date-picker"'),
  name: z.string().regex(PASCAL_CASE, 'name must be PascalCase, e.g. "DatePicker"'),
  category: CategorySchema,
  problem: z.string().min(1, "describe what need this component fills"),
  notes: z.string().optional(),
  expectedVariants: z
    .array(z.string())
    .default([])
    .describe('Free-text variant names the requester expects, e.g. "primary", "with-icon" — not full prop definitions, that\'s the eventual spec\'s job.'),
  status: ComponentRequestStatusSchema,
  requestedBy: z.string().min(1),
  requestedAt: z.string().min(1, "ISO date"),
  figmaFileKey: z.string().optional().describe("Set once a designer shares the Figma file to build this in."),
  promotedSpecId: z.string().optional().describe("Set on promotion — avoids adding provenance fields to ComponentSpecSchema."),
});
export type ComponentRequest = z.infer<typeof ComponentRequestSchema>;

export function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join("");
}

export interface ComponentRequestFields {
  /** kebab-case id */
  name: string;
  category: string;
  problem: string;
  notes?: string;
  expectedVariants: string[];
  requestedBy: string;
}

/**
 * Pure construction, shared by the CLI (`ds request new`) and the docs
 * app's local-dev-only submission route — both validate the result via
 * `ComponentRequestSchema.safeParse` themselves, since they report failures
 * differently (console.error vs. an HTTP response).
 */
export function buildComponentRequest(fields: ComponentRequestFields): ComponentRequest {
  return {
    id: fields.name,
    name: toPascalCase(fields.name),
    category: fields.category as ComponentRequest["category"],
    problem: fields.problem,
    notes: fields.notes?.trim() ? fields.notes : undefined,
    expectedVariants: fields.expectedVariants,
    status: "pending",
    requestedBy: fields.requestedBy,
    requestedAt: new Date().toISOString(),
  };
}

/**
 * The design brief handed to whoever builds this in Figma — a mechanical
 * template, not a model call: it only restates what's already on the
 * request plus the platform's fixed token/anatomy/accessibility
 * conventions. Shared by `ds request brief` and the docs app's brief route.
 */
export function buildDesignBrief(request: ComponentRequest): string {
  const variants =
    request.expectedVariants.length > 0
      ? request.expectedVariants.map((v) => `- ${v}`).join("\n")
      : "- (none specified — use judgment based on the problem statement)";

  const figmaStructure =
    request.expectedVariants.length > 1
      ? `- Build it as a Figma **Component Set** — not a Frame, Group, or mockup. Create each variant as its own Component (select it, Ctrl/Cmd+Alt+K), then select all of them and Combine as Variants.
- Each variant's own component name must contain that variant's text somewhere in it — e.g. a "State=With Timezone" variant property matches "with-timezone" fine, spacing vs. hyphens doesn't matter.`
      : `- Build it as a single Figma **Component** — not a Frame, Group, or mockup. Convert it with Create Component (select it, Ctrl/Cmd+Alt+K).`;

  return `# Design Brief: ${request.name}

## Problem
${request.problem}

## Category
${request.category}

## Expected variants
${variants}

## Notes
${request.notes ?? "(none)"}

## Design system guidelines
- Every color, spacing, radius, and font value must come from the shared token library — never a raw hex/px value. Token references look like \`{color.action.primary.default.bg}\`, \`{spacing.md}\`, \`{radius.md}\`.
- Name each anatomy part clearly (e.g. root, label, icon) and mark which parts are optional.
- Design every interaction state this component needs — default, hover, active, focus, disabled, loading — only the ones that actually apply.
- Document keyboard behavior and ARIA requirements per state. A component can't ship as "stable" without at least one accessibility requirement recorded.
- See \`components/button/spec.json\` in this repo for a fully worked example of the token, anatomy, and accessibility conventions this component should follow.

## Figma structure (what Verify actually checks)
Verify reads the file's real structure via the Figma REST API — a spec sheet or mockup showing every variant won't reconcile, no matter how accurate it looks, unless the file is actually built this way:
${figmaStructure}
- Name it "${request.name}" somewhere in the file — casing and spacing don't matter ("Time Slot Picker" works as well as "TimeSlotPicker").
- Bind at least one fill or text style under it to a real Figma Variable from the shared token library — referencing a token by name in a text label isn't enough, it has to be an actual bound variable.

## Once built
Share the Figma file with the platform team and record its file key on this request (\`figmaFileKey\`), then run \`ds request verify ${request.id}\` to reconcile it automatically.
`;
}

/**
 * The interview context built from a request instead of a raw PRD file —
 * shared by `ds new --from-request` and the docs app's promotion route.
 */
export function buildPrdContextFromRequest(request: ComponentRequest): string {
  return `Component request:\n\nProblem: ${request.problem}\n${
    request.notes ? `Notes: ${request.notes}\n` : ""
  }Expected variants: ${
    request.expectedVariants.length > 0 ? request.expectedVariants.join(", ") : "(none specified)"
  }`;
}

/**
 * Synthesizes a small, ungoverned `ComponentSpec` from a bare request — the
 * payload for a Figma build job (see apps/docs/worker/dev-api.ts's
 * /api/figma/jobs routes), never written to components/*​/spec.json. A real
 * spec only exists after promote, which happens *after*
 * ready-for-verification; "Send to Figma" needs to work on an
 * approved/in-design request, before that — this fills the gap with
 * something the Figma plugin's spec-agnostic construction logic
 * (@ds-platform/figma-plugin) can build from: one enum prop carrying the
 * request's expected variants, and one real, always-valid token binding on
 * "root" so the built component actually has a bound Figma Variable.
 * That last part isn't optional — reconcileRequest's `ok` requires at
 * least one bound variable somewhere under the matched node (see
 * packages/figma-client/src/reconcile.ts's hasAnyBoundVariable), so an
 * empty tokens: [] would make every real verify attempt fail by
 * construction, not just look incomplete.
 */
export function draftJobSpec(request: ComponentRequest): ComponentSpec {
  const variants = request.expectedVariants.length > 0 ? request.expectedVariants : ["default"];

  return ComponentSpecSchema.parse({
    id: request.id,
    name: request.name,
    category: request.category,
    status: "draft",
    version: "0.1.0",
    owner: "@ds-lead",
    description: `(Figma job draft — not a governed spec) ${request.problem}`,
    anatomy: {
      root: "div element",
      parts: [{ name: "label", description: `${request.name}'s content.`, optional: false }],
    },
    props: [
      {
        name: "variant",
        type: "enum",
        description: "Visual variant.",
        required: false,
        platforms: ["react", "react-native"],
        values: variants,
      },
    ],
    states: ["default"],
    invalidCombinations: [],
    tokens: [
      {
        part: "root",
        when: {},
        properties: {
          backgroundColor: "{color.action.primary.default.bg}",
          borderRadius: "{radius.md}",
          paddingBlock: "{spacing.sm}",
          paddingInline: "{spacing.md}",
        },
      },
    ],
    accessibility: {
      role: "group",
      keyboard: {},
      aria: [],
      contrast: [],
      requirements: ["(Figma job draft) add real accessibility requirements before promoting."],
    },
    examples: variants.map((v) => ({ name: v, props: { variant: v }, state: "default" })),
    overrides: { imports: [] },
  });
}
