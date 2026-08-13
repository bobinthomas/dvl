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
  root_primary_small: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#EFF6FF"},
  label_primary_small: {"color":"#1D4ED8","fontSize":13},
  icon_primary_small: {"color":"#1D4ED8"},
  root_primary_small_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#EFF6FF"},
  label_primary_small_loading: {"color":"#1D4ED8","fontSize":13},
  icon_primary_small_loading: {"color":"#1D4ED8"},
  root_primary_medium: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#EFF6FF"},
  label_primary_medium: {"color":"#1D4ED8","fontSize":13},
  icon_primary_medium: {"color":"#1D4ED8"},
  root_primary_medium_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#EFF6FF"},
  label_primary_medium_loading: {"color":"#1D4ED8","fontSize":13},
  icon_primary_medium_loading: {"color":"#1D4ED8"},
  root_primary_large: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#EFF6FF"},
  label_primary_large: {"color":"#1D4ED8","fontSize":13},
  icon_primary_large: {"color":"#1D4ED8"},
  root_primary_large_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#EFF6FF"},
  label_primary_large_loading: {"color":"#1D4ED8","fontSize":13},
  icon_primary_large_loading: {"color":"#1D4ED8"},
  root_success_small: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F0FDF4"},
  label_success_small: {"color":"#15803D","fontSize":13},
  icon_success_small: {"color":"#15803D"},
  root_success_small_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F0FDF4"},
  label_success_small_loading: {"color":"#15803D","fontSize":13},
  icon_success_small_loading: {"color":"#15803D"},
  root_success_medium: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F0FDF4"},
  label_success_medium: {"color":"#15803D","fontSize":13},
  icon_success_medium: {"color":"#15803D"},
  root_success_medium_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F0FDF4"},
  label_success_medium_loading: {"color":"#15803D","fontSize":13},
  icon_success_medium_loading: {"color":"#15803D"},
  root_success_large: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F0FDF4"},
  label_success_large: {"color":"#15803D","fontSize":13},
  icon_success_large: {"color":"#15803D"},
  root_success_large_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F0FDF4"},
  label_success_large_loading: {"color":"#15803D","fontSize":13},
  icon_success_large_loading: {"color":"#15803D"},
  root_error_small: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FEF2F2"},
  label_error_small: {"color":"#B91C1C","fontSize":13},
  icon_error_small: {"color":"#B91C1C"},
  root_error_small_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FEF2F2"},
  label_error_small_loading: {"color":"#B91C1C","fontSize":13},
  icon_error_small_loading: {"color":"#B91C1C"},
  root_error_medium: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FEF2F2"},
  label_error_medium: {"color":"#B91C1C","fontSize":13},
  icon_error_medium: {"color":"#B91C1C"},
  root_error_medium_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FEF2F2"},
  label_error_medium_loading: {"color":"#B91C1C","fontSize":13},
  icon_error_medium_loading: {"color":"#B91C1C"},
  root_error_large: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FEF2F2"},
  label_error_large: {"color":"#B91C1C","fontSize":13},
  icon_error_large: {"color":"#B91C1C"},
  root_error_large_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FEF2F2"},
  label_error_large_loading: {"color":"#B91C1C","fontSize":13},
  icon_error_large_loading: {"color":"#B91C1C"},
  root_loading_small: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F1F5F9"},
  label_loading_small: {"color":"#475569","fontSize":13},
  icon_loading_small: {"color":"#475569"},
  root_loading_small_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F1F5F9"},
  label_loading_small_loading: {"color":"#475569","fontSize":13},
  icon_loading_small_loading: {"color":"#475569"},
  root_loading_medium: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F1F5F9"},
  label_loading_medium: {"color":"#475569","fontSize":13},
  icon_loading_medium: {"color":"#475569"},
  root_loading_medium_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F1F5F9"},
  label_loading_medium_loading: {"color":"#475569","fontSize":13},
  icon_loading_medium_loading: {"color":"#475569"},
  root_loading_large: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F1F5F9"},
  label_loading_large: {"color":"#475569","fontSize":13},
  icon_loading_large: {"color":"#475569"},
  root_loading_large_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#F1F5F9"},
  label_loading_large_loading: {"color":"#475569","fontSize":13},
  icon_loading_large_loading: {"color":"#475569"},
  root_warning_small: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FFFBEB"},
  label_warning_small: {"color":"#B45309","fontSize":13},
  icon_warning_small: {"color":"#B45309"},
  root_warning_small_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FFFBEB"},
  label_warning_small_loading: {"color":"#B45309","fontSize":13},
  icon_warning_small_loading: {"color":"#B45309"},
  root_warning_medium: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FFFBEB"},
  label_warning_medium: {"color":"#B45309","fontSize":13},
  icon_warning_medium: {"color":"#B45309"},
  root_warning_medium_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FFFBEB"},
  label_warning_medium_loading: {"color":"#B45309","fontSize":13},
  icon_warning_medium_loading: {"color":"#B45309"},
  root_warning_large: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FFFBEB"},
  label_warning_large: {"color":"#B45309","fontSize":13},
  icon_warning_large: {"color":"#B45309"},
  root_warning_large_loading: {"borderRadius":16,"paddingVertical":6,"paddingHorizontal":12,"backgroundColor":"#FFFBEB"},
  label_warning_large_loading: {"color":"#B45309","fontSize":13},
  icon_warning_large_loading: {"color":"#B45309"},
});
