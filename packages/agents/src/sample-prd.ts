import { z } from "zod";
import { callModel } from "./call-model.js";
import type { ModelClient } from "./gateway-client.js";

export const SamplePrdSchema = z.object({
  prdText: z
    .string()
    .min(1)
    .describe(
      "A 300-600 word realistic PRD in markdown: a Problem/Overview section and a Requirements/User Stories section mentioning concrete UI needs."
    ),
});
export type SamplePrd = z.infer<typeof SamplePrdSchema>;

const SYSTEM_PROMPT = `You write short, realistic sample PRDs for testing a tool that scans PRDs for
implied UI components. Given an optional one-line hint about the product area, invent a plausible
small feature and write a 300-600 word markdown PRD with a Problem/Overview section and a
Requirements or User Stories section. Mention concrete UI needs the way a real PRD would (e.g. "the
customer picks a date range") — don't just list component names. If no hint is given, invent any
plausible small e-commerce, dashboard, or SaaS-settings feature. This is test data — keep it generic
and inoffensive.`;

/**
 * Fills PrdScanForm's PRD textarea so the wizard's step 1 can be
 * click-tested without a real PRD file on hand.
 */
export async function generateSamplePrd(client: ModelClient, model: string, hint?: string): Promise<SamplePrd> {
  return callModel(client, model, {
    schema: SamplePrdSchema,
    schemaName: "sample_prd",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: hint?.trim() ? `Hint: ${hint.trim()}` : "No hint given — invent a plausible small feature.",
      },
    ],
  });
}
