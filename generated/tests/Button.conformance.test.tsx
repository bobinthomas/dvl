/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/button/spec.json (version 1.0.0).
 * Regenerate with `ds build button`. Web conformance — role, keyboard, ARIA, contrast.
 */
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { resolveToken, contrastRatio, type TokenTree } from "@ds-platform/core";
import { Button } from "../react/Button.js";
import "../react/button.css";
import "../react/tokens.css";
import rawTokens from "../../tokens/tokens.json";

const tokens = rawTokens as unknown as TokenTree;

describe("Button conformance (web)", () => {
  it('exposes role "button"', () => {
    render(<Button onPress={() => {}}>Button</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("Enter: activates the button", async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Button</Button>);
    const user = userEvent.setup();
    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");
    expect(onPress).toHaveBeenCalled();
  });

  it("Space: activates the button", async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Button</Button>);
    const user = userEvent.setup();
    screen.getByRole("button").focus();
    await user.keyboard("{ }");
    expect(onPress).toHaveBeenCalled();
  });

  it("aria-disabled is absent when loading, disabled are all false", () => {
    const { getByRole, unmount } = render(<Button onPress={() => {}}>Button</Button>);
    expect(getByRole("button")).not.toHaveAttribute("aria-disabled");
    unmount();
  });

  it("aria-disabled=\"true\" when loading is true — \"true when disabled or loading is true\"", () => {
    const { getByRole, unmount } = render(<Button onPress={() => {}} loading>Button</Button>);
    expect(getByRole("button")).toHaveAttribute("aria-disabled", "true");
    unmount();
  });

  it("aria-disabled=\"true\" when disabled is true — \"true when disabled or loading is true\"", () => {
    const { getByRole, unmount } = render(<Button onPress={() => {}} disabled>Button</Button>);
    expect(getByRole("button")).toHaveAttribute("aria-disabled", "true");
    unmount();
  });

  it("aria-busy is absent when loading are all false", () => {
    const { getByRole, unmount } = render(<Button onPress={() => {}}>Button</Button>);
    expect(getByRole("button")).not.toHaveAttribute("aria-busy");
    unmount();
  });

  it("aria-busy=\"true\" when loading is true — \"true when loading is true\"", () => {
    const { getByRole, unmount } = render(<Button onPress={() => {}} loading>Button</Button>);
    expect(getByRole("button")).toHaveAttribute("aria-busy", "true");
    unmount();
  });

  it("contrast for \"root\" (foreground {color.action.primary.default.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.action.primary.default.fg}", tokens);
    const bg = resolveToken("{color.action.primary.default.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("contrast for \"root\" (foreground {color.action.secondary.default.fg}) meets 4.5:1", () => {
    const fg = resolveToken("{color.action.secondary.default.fg}", tokens);
    const bg = resolveToken("{color.action.secondary.default.bg}", tokens);
    const ratio = contrastRatio(String(fg.value), String(bg.value));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

});
