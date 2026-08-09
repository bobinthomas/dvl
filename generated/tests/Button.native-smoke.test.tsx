/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/button/spec.json (version 1.0.0).
 * Regenerate with `ds build button`. Native smoke test — renders via react-native-web.
 */
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "../react-native/Button.js";

describe("Button conformance (native)", () => {
  it("renders primary / small", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"primary"} size={"small"}>Button</Button>);
    unmount();
  });

  it("renders primary / medium", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"primary"} size={"medium"}>Button</Button>);
    unmount();
  });

  it("renders primary / large", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"primary"} size={"large"}>Button</Button>);
    unmount();
  });

  it("renders secondary / small", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"secondary"} size={"small"}>Button</Button>);
    unmount();
  });

  it("renders secondary / medium", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"secondary"} size={"medium"}>Button</Button>);
    unmount();
  });

  it("renders secondary / large", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"secondary"} size={"large"}>Button</Button>);
    unmount();
  });

  it("renders tertiary / small", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"tertiary"} size={"small"}>Button</Button>);
    unmount();
  });

  it("renders tertiary / medium", () => {
    const { unmount } = render(<Button onPress={() => {}} variant={"tertiary"} size={"medium"}>Button</Button>);
    unmount();
  });

  it("renders disabled", () => {
    const { unmount } = render(<Button onPress={() => {}} disabled>Button</Button>);
    unmount();
  });

  it("renders loading", () => {
    const { unmount } = render(<Button onPress={() => {}} loading>Button</Button>);
    unmount();
  });

});
