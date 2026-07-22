import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

import { COLORS } from "../constants/theme";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: COLORS.primary,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
