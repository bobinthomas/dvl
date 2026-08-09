import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ChatMessage, ModelClient } from "./gateway-client.js";

export class ModelOutputError extends Error {
  constructor(
    public readonly schemaName: string,
    public readonly attempts: number,
    public readonly lastIssue: string
  ) {
    super(
      `model output for "${schemaName}" failed schema validation after ${attempts} attempt(s): ${lastIssue}`
    );
    this.name = "ModelOutputError";
  }
}

export interface CallModelOptions<T> {
  // Input pinned to `any` rather than left to default to T: with both
  // Output and Input equal to T, TS's inference for the generic <T> here
  // sometimes resolves to the pre-`.default()` input shape instead of the
  // parsed output shape (defaulted fields showing up optional). Decoupling
  // Input forces inference through the output-producing position only.
  schema: z.ZodType<T, z.ZodTypeDef, any>;
  schemaName: string;
  system: string;
  messages: ChatMessage[];
  /**
   * Runs on the raw parsed JSON before schema validation, on every attempt.
   * For normalizing a field the caller enforces regardless of what the
   * model returns (e.g. intake-interview always forcing status: "draft")
   * — without this, a model that ignores that instruction could fail
   * validation for a reason the caller was always going to fix anyway.
   */
  normalize?: (raw: unknown) => unknown;
}

const MAX_ATTEMPTS = 2;

/**
 * The one place every agent calls into the gateway. Structured output via
 * `response_format.json_schema`, then parsed and validated against the same
 * Zod schema before anything downstream sees it. A model returning
 * malformed JSON, or JSON that doesn't satisfy the schema, is an expected
 * case handled with one retry (telling the model exactly what was wrong)
 * and then a typed `ModelOutputError` — never an uncaught exception.
 */
export async function callModel<T>(
  client: ModelClient,
  model: string,
  options: CallModelOptions<T>
): Promise<T> {
  const jsonSchema = zodToJsonSchema(options.schema, { $refStrategy: "none" }) as Record<
    string,
    unknown
  >;
  const baseMessages: ChatMessage[] = [{ role: "system", content: options.system }, ...options.messages];

  let lastIssue = "(no attempts made)";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const messages: ChatMessage[] =
      attempt === 1
        ? baseMessages
        : [
            ...baseMessages,
            {
              role: "user",
              content: `Your previous response did not match the required schema: ${lastIssue}. Return corrected JSON only, matching the schema exactly.`,
            },
          ];

    const raw = await client.complete({
      model,
      messages,
      schemaName: options.schemaName,
      jsonSchema,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      lastIssue = `response was not valid JSON: ${(err as Error).message}`;
      continue;
    }

    if (options.normalize) parsed = options.normalize(parsed);

    const result = options.schema.safeParse(parsed);
    if (result.success) return result.data;
    lastIssue = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  }

  throw new ModelOutputError(options.schemaName, MAX_ATTEMPTS, lastIssue);
}
