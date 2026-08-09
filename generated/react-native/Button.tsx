/**
 * GENERATED FILE. Do not edit by hand — your changes will be silently
 * overwritten. Source: components/button/spec.json (version 1.0.0).
 * Regenerate with `ds build button`. Behaviour that can't be
 * expressed here belongs in overrides/button/.
 */
// Every style value below is pre-resolved from tokens/tokens.json at
// generation time, so this file's only runtime dependency is "react" and
// "react-native" — no @ds-platform/core, no token tree.
import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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

export function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  onPress,
  icon,
  children,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = React.useState(false);
  const state = loading ? "loading" : disabled ? "disabled" : pressed ? "active" : undefined;
  const comboKey = variant + "_" + size;
  const stateSuffix = state ? "_" + state : "";
  return (
    <Pressable
      accessibilityRole={"button"}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles["root_" + comboKey + stateSuffix]}
      {...rest}
    >
      {icon ? <View style={styles["icon_" + comboKey + stateSuffix]}>{icon}</View> : null}
      {loading ? <ActivityIndicator style={styles["loader_" + comboKey + stateSuffix]} /> : null}
      <Text style={styles["label_" + comboKey + stateSuffix]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root_primary_small: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#0052CC"},
  label_primary_small: {"fontSize":13,"color":"#FFFFFF"},
  root_primary_small_disabled: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#DFE1E6"},
  label_primary_small_disabled: {"fontSize":13,"color":"#6B778C"},
  root_primary_small_loading: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#0052CC"},
  label_primary_small_loading: {"fontSize":13,"color":"#FFFFFF"},
  root_primary_small_active: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#003D99"},
  label_primary_small_active: {"fontSize":13,"color":"#FFFFFF"},
  root_primary_medium: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#0052CC"},
  label_primary_medium: {"fontSize":14,"color":"#FFFFFF"},
  root_primary_medium_disabled: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#DFE1E6"},
  label_primary_medium_disabled: {"fontSize":14,"color":"#6B778C"},
  root_primary_medium_loading: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#0052CC"},
  label_primary_medium_loading: {"fontSize":14,"color":"#FFFFFF"},
  root_primary_medium_active: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#003D99"},
  label_primary_medium_active: {"fontSize":14,"color":"#FFFFFF"},
  root_primary_large: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#0052CC"},
  label_primary_large: {"fontSize":16,"color":"#FFFFFF"},
  root_primary_large_disabled: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#DFE1E6"},
  label_primary_large_disabled: {"fontSize":16,"color":"#6B778C"},
  root_primary_large_loading: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#0052CC"},
  label_primary_large_loading: {"fontSize":16,"color":"#FFFFFF"},
  root_primary_large_active: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#003D99"},
  label_primary_large_active: {"fontSize":16,"color":"#FFFFFF"},
  root_secondary_small: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_small: {"fontSize":13,"color":"#0052CC"},
  root_secondary_small_disabled: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_small_disabled: {"fontSize":13,"color":"#0052CC"},
  root_secondary_small_loading: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_small_loading: {"fontSize":13,"color":"#0052CC"},
  root_secondary_small_active: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8,"backgroundColor":"#E6EEFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_small_active: {"fontSize":13,"color":"#0052CC"},
  root_secondary_medium: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_medium: {"fontSize":14,"color":"#0052CC"},
  root_secondary_medium_disabled: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_medium_disabled: {"fontSize":14,"color":"#0052CC"},
  root_secondary_medium_loading: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_medium_loading: {"fontSize":14,"color":"#0052CC"},
  root_secondary_medium_active: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12,"backgroundColor":"#E6EEFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_medium_active: {"fontSize":14,"color":"#0052CC"},
  root_secondary_large: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_large: {"fontSize":16,"color":"#0052CC"},
  root_secondary_large_disabled: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_large_disabled: {"fontSize":16,"color":"#0052CC"},
  root_secondary_large_loading: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#FFFFFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_large_loading: {"fontSize":16,"color":"#0052CC"},
  root_secondary_large_active: {"borderRadius":6,"paddingVertical":12,"paddingHorizontal":16,"backgroundColor":"#E6EEFF","borderColor":"#0052CC","borderWidth":1},
  label_secondary_large_active: {"fontSize":16,"color":"#0052CC"},
  root_tertiary_small: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8},
  label_tertiary_small: {"fontSize":13,"color":"#0052CC"},
  root_tertiary_small_disabled: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8},
  label_tertiary_small_disabled: {"fontSize":13,"color":"#0052CC"},
  root_tertiary_small_loading: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8},
  label_tertiary_small_loading: {"fontSize":13,"color":"#0052CC"},
  root_tertiary_small_active: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":8},
  label_tertiary_small_active: {"fontSize":13,"color":"#003D99"},
  root_tertiary_medium: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12},
  label_tertiary_medium: {"fontSize":14,"color":"#0052CC"},
  root_tertiary_medium_disabled: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12},
  label_tertiary_medium_disabled: {"fontSize":14,"color":"#0052CC"},
  root_tertiary_medium_loading: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12},
  label_tertiary_medium_loading: {"fontSize":14,"color":"#0052CC"},
  root_tertiary_medium_active: {"borderRadius":6,"paddingVertical":8,"paddingHorizontal":12},
  label_tertiary_medium_active: {"fontSize":14,"color":"#003D99"},
});
