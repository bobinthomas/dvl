/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/status-indicator/spec.json (version 1.0.0).
 * Regenerate with `ds build status-indicator`. Behaviour that can't be
 * expressed here belongs in overrides/status-indicator/.
 */
// Import "./status-indicator.css" (and "./tokens.css") alongside this component —
// styling is data-attribute driven and lives entirely in that stylesheet.
import * as React from "react";

export type StatusIndicatorVariantProps =
  { variant?: "primary" }
  | { variant?: "success" }
  | { variant?: "error" }
  | { variant?: "loading" }
  | { variant?: "warning" };

export interface StatusIndicatorProps extends StatusIndicatorVariantProps {
  /** The size of the status indicator */
  size?: "small" | "medium" | "large";
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** StatusIndicator content. */
  children?: React.ReactNode;
}

export const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(function StatusIndicator(
  {
    variant,
    size,
    icon,
    children,
    ...rest
  },
  ref
) {
  const dataState = undefined;
  return (
    <div
      ref={ref}
      className="ds-status-indicator"
      role="status"
      data-variant={variant}
      data-size={size}
      data-state={dataState}
      {...rest}
    >
      {icon ? <span className="ds-status-indicator__icon" data-part="icon" aria-hidden="true">{icon}</span> : null}
      <span className="ds-status-indicator__label" data-part="label">{children}</span>
    </div>
  );
});

StatusIndicator.displayName = "StatusIndicator";
