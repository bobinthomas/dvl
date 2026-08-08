/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/button/spec.json (version 1.0.0).
 * Regenerate with `ds build button`. Behaviour that can't be
 * expressed here belongs in overrides/button/.
 */
// Import "./button.css" (and "./tokens.css") alongside this component —
// styling is data-attribute driven and lives entirely in that stylesheet.
import * as React from "react";

export type ButtonVariantProps =
  { variant?: "primary"; size?: "small" }
  | { variant?: "primary"; size?: "medium" }
  | { variant?: "primary"; size?: "large" }
  | { variant?: "secondary"; size?: "small" }
  | { variant?: "secondary"; size?: "medium" }
  | { variant?: "secondary"; size?: "large" }
  | { variant?: "tertiary"; size?: "small" }
  | { variant?: "tertiary"; size?: "medium" };

export interface ButtonProps extends ButtonVariantProps {
  /** Shows a loader in place of the label and disables interaction. */
  loading?: boolean;
  /** Prevents interaction and applies disabled styling. */
  disabled?: boolean;
  /** Callback fired when the button is activated by click, tap, or keyboard. */
  onPress: () => void;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Button content. */
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "medium",
    loading = false,
    disabled = false,
    onPress,
    icon,
    children,
    ...rest
  },
  ref
) {
  const dataState = loading ? "loading" : disabled ? "disabled" : undefined;
  return (
    <button
      ref={ref}
      className="ds-button"
      data-variant={variant}
      data-size={size}
      data-state={dataState}
      disabled={disabled || loading}
      aria-disabled={(disabled || loading) || undefined}
      aria-busy={loading || undefined}
      onClick={onPress}
      {...rest}
    >
      {icon ? <span className="ds-button__icon" data-part="icon" aria-hidden="true">{icon}</span> : null}
      {loading ? <span className="ds-button__loader" data-part="loader" aria-hidden="true" /> : null}
      <span className="ds-button__label" data-part="label">{children}</span>
    </button>
  );
});

Button.displayName = "Button";
