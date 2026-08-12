import { describe, it, expect } from "vitest";
import type { ComponentRequest } from "@ds-platform/core";
import { reconcileRequest } from "./reconcile.js";
import type { FigmaFileNode } from "./client.js";

const REQUEST: ComponentRequest = {
  id: "date-picker",
  name: "DatePicker",
  category: "forms",
  problem: "Customers need to pick a pickup day.",
  expectedVariants: ["single", "range"],
  status: "in-design",
  requestedBy: "@pm-jamie",
  requestedAt: "2026-08-01T00:00:00.000Z",
  figmaFileKey: "abc123",
};

function fileWith(document: FigmaFileNode["document"]): FigmaFileNode {
  return { name: "Design System", document };
}

describe("reconcileRequest", () => {
  it("fails when no component/component-set with the request's name exists", () => {
    const file = fileWith({ id: "0:0", name: "Document", type: "DOCUMENT", children: [] });

    const report = reconcileRequest(REQUEST, file);

    expect(report.ok).toBe(false);
    expect(report.missing).toEqual(["single", "range"]);
    expect(report.issues[0]).toContain('no component or component-set named "DatePicker"');
  });

  it("matches a component named with spaces/hyphens the way a designer naturally would, not just exact PascalCase", () => {
    const file = fileWith({
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [
        {
          id: "1:1",
          name: "Date Picker",
          type: "COMPONENT_SET",
          boundVariables: { fills: [{ type: "VARIABLE_ALIAS", id: "VariableID:1:1" }] },
          children: [
            { id: "1:2", name: "mode=single", type: "COMPONENT" },
            { id: "1:3", name: "mode=range", type: "COMPONENT" },
          ],
        },
      ],
    });

    const report = reconcileRequest(REQUEST, file);

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("passes when the component set exists, every expected variant is matched, and variables are bound", () => {
    const file = fileWith({
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [
        {
          id: "1:1",
          name: "DatePicker",
          type: "COMPONENT_SET",
          children: [
            {
              id: "1:2",
              name: "mode=single",
              type: "COMPONENT",
              boundVariables: { fills: [{ type: "VARIABLE_ALIAS", id: "VariableID:1:1" }] },
            },
            { id: "1:3", name: "mode=range", type: "COMPONENT" },
          ],
        },
      ],
    });

    const report = reconcileRequest(REQUEST, file);

    expect(report.ok).toBe(true);
    expect(report.matched.sort()).toEqual(["range", "single"]);
    expect(report.missing).toEqual([]);
    expect(report.issues).toEqual([]);
  });

  it("matches a variant child named in Figma's own \"Property=Value\" convention, not just the request's hyphenated spelling", () => {
    const request: ComponentRequest = { ...REQUEST, expectedVariants: ["single", "with-range"] };
    const file = fileWith({
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [
        {
          id: "1:1",
          name: "DatePicker",
          type: "COMPONENT_SET",
          boundVariables: { fills: [{ type: "VARIABLE_ALIAS", id: "VariableID:1:1" }] },
          children: [
            { id: "1:2", name: "Mode=Single", type: "COMPONENT" },
            { id: "1:3", name: "Mode=With Range", type: "COMPONENT" },
          ],
        },
      ],
    });

    const report = reconcileRequest(request, file);

    expect(report.ok).toBe(true);
    expect(report.matched.sort()).toEqual(["single", "with-range"]);
  });

  it("reports missing variants that have no matching child", () => {
    const file = fileWith({
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [
        {
          id: "1:1",
          name: "DatePicker",
          type: "COMPONENT_SET",
          boundVariables: { fills: [{ type: "VARIABLE_ALIAS", id: "VariableID:1:1" }] },
          children: [{ id: "1:2", name: "mode=single", type: "COMPONENT" }],
        },
      ],
    });

    const report = reconcileRequest(REQUEST, file);

    expect(report.ok).toBe(false);
    expect(report.matched).toEqual(["single"]);
    expect(report.missing).toEqual(["range"]);
    expect(report.issues).toContain('no variant matching "range" found under "DatePicker"');
  });

  it("flags when no node under the component uses a bound Design Token variable", () => {
    const file = fileWith({
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [
        {
          id: "1:1",
          name: "DatePicker",
          type: "COMPONENT_SET",
          children: [
            { id: "1:2", name: "mode=single", type: "COMPONENT" },
            { id: "1:3", name: "mode=range", type: "COMPONENT" },
          ],
        },
      ],
    });

    const report = reconcileRequest(REQUEST, file);

    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.includes("no Design Token variables are bound"))).toBe(true);
  });
});
