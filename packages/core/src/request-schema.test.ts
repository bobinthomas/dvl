import { describe, it, expect } from "vitest";
import { draftJobSpec, type ComponentRequest } from "./request-schema.js";
import { ComponentSpecSchema } from "./schema.js";

const BASE_REQUEST: ComponentRequest = {
  id: "date-picker",
  name: "DatePicker",
  category: "forms",
  problem: "Customers need to pick a pickup day from the next 7 available days.",
  expectedVariants: ["single", "range"],
  status: "approved",
  requestedBy: "bobin",
  requestedAt: "2026-08-10T00:00:00.000Z",
};

describe("draftJobSpec", () => {
  it("produces a schema-valid ComponentSpec from a bare request", () => {
    const spec = draftJobSpec(BASE_REQUEST);
    expect(ComponentSpecSchema.safeParse(spec).success).toBe(true);
    expect(spec.id).toBe("date-picker");
    expect(spec.status).toBe("draft");
  });

  it("uses the request's expected variants as the enum prop's values", () => {
    const spec = draftJobSpec(BASE_REQUEST);
    const variantProp = spec.props.find((p) => p.name === "variant");
    expect(variantProp?.values).toEqual(["single", "range"]);
  });

  it("falls back to a single implicit variant when none are declared", () => {
    const spec = draftJobSpec({ ...BASE_REQUEST, expectedVariants: [] });
    const variantProp = spec.props.find((p) => p.name === "variant");
    expect(variantProp?.values).toEqual(["default"]);
  });

  it("always has at least one real token binding, never an empty tokens: []", () => {
    // reconcileRequest's `ok` requires a bound Figma Variable somewhere under
    // the matched node (packages/figma-client/src/reconcile.ts) — an empty
    // tokens array here would make every real verify attempt fail by
    // construction, so this is a hard invariant, not just a nicety.
    const spec = draftJobSpec(BASE_REQUEST);
    expect(spec.tokens.length).toBeGreaterThan(0);
    expect(Object.keys(spec.tokens[0]!.properties).length).toBeGreaterThan(0);
  });

  it("covers every variant with its own example", () => {
    const spec = draftJobSpec(BASE_REQUEST);
    expect(spec.examples.map((e) => e.props.variant)).toEqual(["single", "range"]);
  });
});
