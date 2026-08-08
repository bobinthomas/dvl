import { z } from "zod";

/**
 * The component spec contract. This is the ONLY hand-authored shape in the
 * platform — everything else (schemas/component.schema.json, generated
 * code, docs, stories, tests, Figma) is derived from a spec that conforms
 * to this. Run `pnpm schema:emit` after editing this file to regenerate
 * the published JSON Schema.
 */

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;
const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** A token reference, e.g. `{color.action.primary.default.bg}`. Never a raw value. */
export const TokenRefSchema = z
  .string()
  .regex(
    /^\{[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9][a-zA-Z0-9]*)+\}$/,
    "must be a token reference like {color.action.primary.default.bg}, not a raw value"
  );
export type TokenRef = z.infer<typeof TokenRefSchema>;

export const CategorySchema = z.enum([
  "actions",
  "forms",
  "feedback",
  "layout",
  "navigation",
  "data-display",
]);

export const StatusSchema = z.enum(["draft", "stable", "deprecated"]);

export const PlatformSchema = z.enum(["react", "react-native"]);

/** Fixed interaction-state vocabulary. A spec declares the subset it uses via `states`. */
export const StateSchema = z.enum([
  "default",
  "hover",
  "active",
  "focus",
  "disabled",
  "loading",
]);
export type ComponentState = z.infer<typeof StateSchema>;

export const PropTypeSchema = z.enum([
  "enum",
  "boolean",
  "string",
  "number",
  "function",
  "node",
]);

export const AnatomyPartSchema = z.object({
  name: z.string().regex(CAMEL_CASE, "anatomy part names must be camelCase"),
  description: z.string().min(1, "anatomy part needs a description"),
  optional: z.boolean().default(false),
});

export const AnatomySchema = z.object({
  root: z.string().min(1),
  parts: z.array(AnatomyPartSchema).default([]),
});

export const PropDefSchema = z
  .object({
    name: z.string().regex(CAMEL_CASE, "prop names must be camelCase"),
    type: PropTypeSchema,
    description: z.string().min(1, "every prop needs a description"),
    required: z.boolean().default(false),
    platforms: z.array(PlatformSchema).default(["react", "react-native"]),
    values: z.array(z.string()).optional(),
    default: z.union([z.string(), z.boolean(), z.number()]).optional(),
  })
  .superRefine((prop, ctx) => {
    if (prop.type === "enum") {
      if (!prop.values || prop.values.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["values"],
          message: `enum prop "${prop.name}" must declare a non-empty "values" list`,
        });
      } else if (
        prop.default !== undefined &&
        !prop.values.includes(String(prop.default))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["default"],
          message: `default "${String(prop.default)}" is not one of values [${prop.values.join(", ")}]`,
        });
      }
    } else if (prop.values !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["values"],
        message: `"values" is only valid on enum props, not "${prop.type}" prop "${prop.name}"`,
      });
    }
  });
export type PropDef = z.infer<typeof PropDefSchema>;

/**
 * A partial context match: prop name (or the literal key "state") -> value.
 * Deliberately flat — see BUILD-PROMPT "Selector matching". Do not turn this
 * into a nested per-variant structure.
 */
export const WhenSchema = z.record(z.string(), z.string());

export const TokenBindingSchema = z.object({
  part: z.string().min(1),
  when: WhenSchema.default({}),
  properties: z.record(z.string(), TokenRefSchema),
});
export type TokenBinding = z.infer<typeof TokenBindingSchema>;

/** A forbidden partial combination of prop values (and/or state). Pruned everywhere. */
export const InvalidCombinationSchema = z
  .record(z.string(), z.string())
  .refine((c) => Object.keys(c).length >= 2, {
    message: "an invalid combination needs at least two keys to be meaningful",
  });

export const ContrastPairSchema = z.object({
  part: z.string().min(1),
  foreground: TokenRefSchema,
  background: TokenRefSchema,
  minRatio: z.number().positive().default(4.5),
});

export const AccessibilitySchema = z.object({
  role: z.string().min(1),
  keyboard: z.record(z.string(), z.string()).default({}),
  aria: z
    .array(z.object({ attribute: z.string(), condition: z.string() }))
    .default([]),
  contrast: z.array(ContrastPairSchema).default([]),
  requirements: z.array(z.string()).default([]),
});

export const ExampleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  props: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).default({}),
  state: StateSchema.default("default"),
});

export const OverridesSchema = z.object({
  imports: z.array(z.string()).default([]),
});

export const ComponentSpecSchema = z
  .object({
    id: z.string().regex(KEBAB_CASE, "id must be kebab-case, e.g. \"button\""),
    name: z.string().regex(PASCAL_CASE, "name must be PascalCase, e.g. \"Button\""),
    category: CategorySchema,
    status: StatusSchema,
    version: z.string().regex(SEMVER, "version must be semver, e.g. \"1.0.0\""),
    owner: z.string().min(1),
    description: z.string().min(1),
    anatomy: AnatomySchema,
    props: z.array(PropDefSchema).default([]),
    states: z.array(StateSchema).min(1).default(["default"]),
    invalidCombinations: z.array(InvalidCombinationSchema).default([]),
    tokens: z.array(TokenBindingSchema).default([]),
    accessibility: AccessibilitySchema,
    examples: z.array(ExampleSchema).min(1, "at least one example is required"),
    overrides: OverridesSchema.default({ imports: [] }),
  })
  .superRefine((spec, ctx) => {
    const propNames = new Set(spec.props.map((p) => p.name));
    const seen = new Set<string>();
    for (const p of spec.props) {
      if (seen.has(p.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["props"],
          message: `duplicate prop name "${p.name}"`,
        });
      }
      seen.add(p.name);
    }
    if (!spec.states.includes("default")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["states"],
        message: `"states" must include "default"`,
      });
    }
    if (spec.status === "stable" && spec.accessibility.requirements.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accessibility", "requirements"],
        message: `status "stable" requires at least one accessibility requirement`,
      });
    }
    spec.invalidCombinations.forEach((combo, i) => {
      for (const key of Object.keys(combo)) {
        if (key !== "state" && !propNames.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["invalidCombinations", i, key],
            message: `"${key}" is not a declared prop or "state"`,
          });
        }
      }
    });
  });

export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;
