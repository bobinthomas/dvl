/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/status-indicator/spec.json (version 1.0.0).
 * Regenerate with `ds build status-indicator`. Behaviour that can't be
 * expressed here belongs in overrides/status-indicator/.
 */
// Every style value below is pre-resolved from tokens/tokens.json at
// generation time, so this file's only runtime dependency is "react" and
// "react-native" — no @ds-platform/core, no token tree.
import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export type StatusIndicatorVariantProps =
  { variant?: "primary" }
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

export function StatusIndicator({
  variant,
  size,
  icon,
  children,
  ...rest
}: StatusIndicatorProps) {
  const state = undefined;
  const comboKey = variant + "_" + size;
  const stateSuffix = state ? "_" + state : "";
  return (
    <Pressable
      accessibilityRole={"status"}
      style={styles["root_" + comboKey + stateSuffix]}
      {...rest}
    >
      {icon ? <View style={styles["icon_" + comboKey + stateSuffix]}>{icon}</View> : null}
      <Text style={styles["label_" + comboKey + stateSuffix]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label_primary_small: {"color":"#172B4D","fontSize":13},
  icon_primary_small: {"color":"#0052CC"},
  label_primary_small_loading: {"color":"#172B4D","fontSize":13},
  icon_primary_small_loading: {"color":"#0052CC"},
  label_primary_medium: {"color":"#172B4D","fontSize":13},
  icon_primary_medium: {"color":"#0052CC"},
  label_primary_medium_loading: {"color":"#172B4D","fontSize":13},
  icon_primary_medium_loading: {"color":"#0052CC"},
  label_primary_large: {"color":"#172B4D","fontSize":13},
  icon_primary_large: {"color":"#0052CC"},
  label_primary_large_loading: {"color":"#172B4D","fontSize":13},
  icon_primary_large_loading: {"color":"#0052CC"},
  label_success_small: {"color":"#172B4D","fontSize":13},
  icon_success_small: {"color":"#0052CC"},
  label_success_small_loading: {"color":"#172B4D","fontSize":13},
  icon_success_small_loading: {"color":"#0052CC"},
  label_success_medium: {"color":"#172B4D","fontSize":13},
  icon_success_medium: {"color":"#0052CC"},
  label_success_medium_loading: {"color":"#172B4D","fontSize":13},
  icon_success_medium_loading: {"color":"#0052CC"},
  label_success_large: {"color":"#172B4D","fontSize":13},
  icon_success_large: {"color":"#0052CC"},
  label_success_large_loading: {"color":"#172B4D","fontSize":13},
  icon_success_large_loading: {"color":"#0052CC"},
  label_error_small: {"color":"#172B4D","fontSize":13},
  icon_error_small: {"color":"#0052CC"},
  label_error_small_loading: {"color":"#172B4D","fontSize":13},
  icon_error_small_loading: {"color":"#0052CC"},
  label_error_medium: {"color":"#172B4D","fontSize":13},
  icon_error_medium: {"color":"#0052CC"},
  label_error_medium_loading: {"color":"#172B4D","fontSize":13},
  icon_error_medium_loading: {"color":"#0052CC"},
  label_error_large: {"color":"#172B4D","fontSize":13},
  icon_error_large: {"color":"#0052CC"},
  label_error_large_loading: {"color":"#172B4D","fontSize":13},
  icon_error_large_loading: {"color":"#0052CC"},
  label_loading_small: {"color":"#172B4D","fontSize":13},
  icon_loading_small: {"color":"#0052CC"},
  label_loading_small_loading: {"color":"#172B4D","fontSize":13},
  icon_loading_small_loading: {"color":"#0052CC"},
  label_loading_medium: {"color":"#172B4D","fontSize":13},
  icon_loading_medium: {"color":"#0052CC"},
  label_loading_medium_loading: {"color":"#172B4D","fontSize":13},
  icon_loading_medium_loading: {"color":"#0052CC"},
  label_loading_large: {"color":"#172B4D","fontSize":13},
  icon_loading_large: {"color":"#0052CC"},
  label_loading_large_loading: {"color":"#172B4D","fontSize":13},
  icon_loading_large_loading: {"color":"#0052CC"},
  label_warning_small: {"color":"#172B4D","fontSize":13},
  icon_warning_small: {"color":"#0052CC"},
  label_warning_small_loading: {"color":"#172B4D","fontSize":13},
  icon_warning_small_loading: {"color":"#0052CC"},
  label_warning_medium: {"color":"#172B4D","fontSize":13},
  icon_warning_medium: {"color":"#0052CC"},
  label_warning_medium_loading: {"color":"#172B4D","fontSize":13},
  icon_warning_medium_loading: {"color":"#0052CC"},
  label_warning_large: {"color":"#172B4D","fontSize":13},
  icon_warning_large: {"color":"#0052CC"},
  label_warning_large_loading: {"color":"#172B4D","fontSize":13},
  icon_warning_large_loading: {"color":"#0052CC"},
});
