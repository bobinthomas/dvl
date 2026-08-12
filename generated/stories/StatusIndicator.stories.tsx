/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/status-indicator/spec.json (version 1.0.0).
 * Regenerate with `ds build status-indicator`.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StatusIndicator } from "../react/StatusIndicator.js";
import "../react/status-indicator.css";
import "../react/tokens.css";

const meta: Meta<typeof StatusIndicator> = {
  title: "Feedback/StatusIndicator",
  component: StatusIndicator,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof StatusIndicator>;

export const LoadingStatusIndicator: Story = {
  name: "Loading status indicator",
  args: {
    variant: "loading",
    size: "medium",
    children: "StatusIndicator",
  },
};

export const SuccessStatusIndicator: Story = {
  name: "Success status indicator",
  args: {
    variant: "success",
    size: "small",
    children: "StatusIndicator",
  },
};

export const PrimaryStatusIndicator: Story = {
  name: "Primary status indicator",
  args: {
    variant: "primary",
    size: "large",
    children: "StatusIndicator",
  },
};

export const ErrorStatusIndicator: Story = {
  name: "Error status indicator",
  args: {
    variant: "error",
    children: "StatusIndicator",
  },
};

export const WarningStatusIndicator: Story = {
  name: "Warning status indicator",
  args: {
    variant: "warning",
    children: "StatusIndicator",
  },
};
