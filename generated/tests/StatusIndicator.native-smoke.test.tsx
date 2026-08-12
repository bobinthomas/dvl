/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/status-indicator/spec.json (version 1.0.0).
 * Regenerate with `ds build status-indicator`. Native smoke test — renders via react-native-web.
 */
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatusIndicator } from "../react-native/StatusIndicator.js";

describe("StatusIndicator conformance (native)", () => {
  it("renders primary / small", () => {
    const { unmount } = render(<StatusIndicator variant={"primary"} size={"small"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders primary / medium", () => {
    const { unmount } = render(<StatusIndicator variant={"primary"} size={"medium"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders primary / large", () => {
    const { unmount } = render(<StatusIndicator variant={"primary"} size={"large"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders success / small", () => {
    const { unmount } = render(<StatusIndicator variant={"success"} size={"small"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders success / medium", () => {
    const { unmount } = render(<StatusIndicator variant={"success"} size={"medium"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders success / large", () => {
    const { unmount } = render(<StatusIndicator variant={"success"} size={"large"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders error / small", () => {
    const { unmount } = render(<StatusIndicator variant={"error"} size={"small"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders error / medium", () => {
    const { unmount } = render(<StatusIndicator variant={"error"} size={"medium"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders error / large", () => {
    const { unmount } = render(<StatusIndicator variant={"error"} size={"large"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders loading / small", () => {
    const { unmount } = render(<StatusIndicator variant={"loading"} size={"small"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders loading / medium", () => {
    const { unmount } = render(<StatusIndicator variant={"loading"} size={"medium"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders loading / large", () => {
    const { unmount } = render(<StatusIndicator variant={"loading"} size={"large"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders warning / small", () => {
    const { unmount } = render(<StatusIndicator variant={"warning"} size={"small"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders warning / medium", () => {
    const { unmount } = render(<StatusIndicator variant={"warning"} size={"medium"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

  it("renders warning / large", () => {
    const { unmount } = render(<StatusIndicator variant={"warning"} size={"large"}>StatusIndicator</StatusIndicator>);
    unmount();
  });

});
