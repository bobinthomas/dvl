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

  it("contrast for \"icon\" (foreground {color.status.primary.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.primary.fg}", tokens);
    const bg = resolveToken("{color.status.primary.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"icon\" (foreground {color.status.success.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.success.fg}", tokens);
    const bg = resolveToken("{color.status.success.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"icon\" (foreground {color.status.error.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.error.fg}", tokens);
    const bg = resolveToken("{color.status.error.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"icon\" (foreground {color.status.warning.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.warning.fg}", tokens);
    const bg = resolveToken("{color.status.warning.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"icon\" (foreground {color.status.loading.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.loading.fg}", tokens);
    const bg = resolveToken("{color.status.loading.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"label\" (foreground {color.status.primary.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.primary.fg}", tokens);
    const bg = resolveToken("{color.status.primary.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"label\" (foreground {color.status.success.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.success.fg}", tokens);
    const bg = resolveToken("{color.status.success.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"label\" (foreground {color.status.error.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.error.fg}", tokens);
    const bg = resolveToken("{color.status.error.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"label\" (foreground {color.status.warning.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.warning.fg}", tokens);
    const bg = resolveToken("{color.status.warning.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"label\" (foreground {color.status.loading.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.status.loading.fg}", tokens);
    const bg = resolveToken("{color.status.loading.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

});
