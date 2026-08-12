/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/status-indicator/spec.json (version 1.0.0).
 * Regenerate with `ds build status-indicator`. Web conformance — role, keyboard, ARIA, contrast.
 */
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { resolveToken, contrastRatio, type TokenTree } from "@ds-platform/core";
import { StatusIndicator } from "../react/StatusIndicator.js";
import "../react/status-indicator.css";
import "../react/tokens.css";
import rawTokens from "../../tokens/tokens.json";

const tokens = rawTokens as unknown as TokenTree;

describe("StatusIndicator conformance (web)", () => {
  it('exposes role "status"', () => {
    render(<StatusIndicator variant={"primary"}>StatusIndicator</StatusIndicator>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("contrast for \"icon\" (foreground {color.action.primary.default.bg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.action.primary.default.bg}", tokens);
    const bg = resolveToken("{color.brand.neutral.0}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"label\" (foreground {color.brand.neutral.900}) meets 4.5:1", () => {
    const fg = resolveToken("{color.brand.neutral.900}", tokens);
    const bg = resolveToken("{color.brand.neutral.0}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

});
