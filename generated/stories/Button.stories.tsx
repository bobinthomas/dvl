/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/button/spec.json (version 1.0.0).
 * Regenerate with `ds build button`.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../react/Button.js";
import "../react/button.css";
import "../react/tokens.css";

const meta: Meta<typeof Button> = {
  title: "Actions/Button",
  component: Button,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const PrimaryMedium: Story = {
  name: "Primary / Medium",
  args: {
    variant: "primary",
    size: "medium",
    onPress: () => {},
    children: "Button",
  },
};

export const PrimaryHover: Story = {
  name: "Primary / Hover",
  args: {
    variant: "primary",
    size: "medium",
    onPress: () => {},
    children: "Button",
  },
};

export const PrimaryDisabled: Story = {
  name: "Primary / Disabled",
  args: {
    variant: "primary",
    size: "medium",
    disabled: true,
    onPress: () => {},
    children: "Button",
  },
};

export const PrimaryLoading: Story = {
  name: "Primary / Loading",
  args: {
    variant: "primary",
    size: "medium",
    loading: true,
    onPress: () => {},
    children: "Button",
  },
};

export const SecondaryMedium: Story = {
  name: "Secondary / Medium",
  args: {
    variant: "secondary",
    size: "medium",
    onPress: () => {},
    children: "Button",
  },
};

export const TertiarySmall: Story = {
  name: "Tertiary / Small",
  args: {
    variant: "tertiary",
    size: "small",
    onPress: () => {},
    children: "Button",
  },
};

export const PrimaryLarge: Story = {
  name: "Primary / Large",
  args: {
    variant: "primary",
    size: "large",
    onPress: () => {},
    children: "Button",
  },
};
