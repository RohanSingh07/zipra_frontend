import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { create } from "zustand";

import { COLORS, SPACING } from "../../constants/theme";

export type AppAlertButton = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AlertTone = "info" | "success" | "warning" | "error";

type AppAlertOptions = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  tone: AlertTone;
};

type AlertStore = {
  alert: AppAlertOptions | null;
  show: (alert: AppAlertOptions) => void;
  hide: () => void;
};

const useAppAlertStore = create<AlertStore>((set) => ({
  alert: null,
  show: (alert) => set({ alert }),
  hide: () => set({ alert: null }),
}));

const inferTone = (title: string): AlertTone => {
  const normalized = title.toLowerCase();

  if (/error|couldn|unable|failed|not serviceable/.test(normalized)) {
    return "error";
  }
  if (/success|updated|submitted|skipped|ready/.test(normalized)) {
    return "success";
  }
  if (/logout|skip|required|access is off|preference/.test(normalized)) {
    return "warning";
  }
  return "info";
};

export const showAppAlert = (
  title: string,
  message = "",
  buttons: AppAlertButton[] = [{ text: "Got it" }]
) => {
  useAppAlertStore.getState().show({
    title,
    message,
    buttons: buttons.length > 0 ? buttons : [{ text: "Got it" }],
    tone: inferTone(title),
  });
};

const TONE_STYLES: Record<
  AlertTone,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    background: string;
  }
> = {
  info: {
    icon: "information-circle",
    color: COLORS.primaryDark,
    background: COLORS.primarySoft,
  },
  success: {
    icon: "checkmark-circle",
    color: "#16803C",
    background: "#DCFCE7",
  },
  warning: {
    icon: "alert-circle",
    color: "#B45309",
    background: "#FEF3C7",
  },
  error: {
    icon: "close-circle",
    color: "#C2413A",
    background: "#FEE2E2",
  },
};

export default function AppAlertHost() {
  const alert = useAppAlertStore((state) => state.alert);
  const hide = useAppAlertStore((state) => state.hide);

  if (!alert) return null;

  const tone = TONE_STYLES[alert.tone];
  const stackedActions = alert.buttons.length > 2;
  const cancelAction = alert.buttons.find((button) => button.style === "cancel");

  const handleAction = (button: AppAlertButton) => {
    hide();
    requestAnimationFrame(() => button.onPress?.());
  };

  const handleDismiss = () => {
    if (cancelAction) handleAction(cancelAction);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
            <Ionicons name={tone.icon} size={29} color={tone.color} />
          </View>

          <Text style={styles.title}>{alert.title}</Text>
          {alert.message ? (
            <Text style={styles.message}>{alert.message}</Text>
          ) : null}

          <View
            style={[
              styles.actions,
              stackedActions ? styles.actionsStacked : styles.actionsRow,
            ]}
          >
            {alert.buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={`${button.text ?? "Action"}-${index}`}
                  style={[
                    styles.actionButton,
                    !stackedActions && styles.rowActionButton,
                    isCancel && styles.cancelButton,
                    isPrimary && styles.primaryButton,
                    isDestructive && styles.destructiveButton,
                  ]}
                  activeOpacity={0.78}
                  onPress={() => handleAction(button)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      isCancel && styles.cancelText,
                      (isPrimary || isDestructive) && styles.lightActionText,
                    ]}
                  >
                    {button.text ?? "OK"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.58)",
  },
  card: {
    width: "100%",
    maxWidth: 370,
    padding: 22,
    alignItems: "center",
    borderRadius: 26,
    backgroundColor: COLORS.white,
    shadowColor: "#111827",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  iconWrap: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  title: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    marginTop: 22,
    gap: 9,
  },
  actionsRow: {
    flexDirection: "row",
  },
  actionsStacked: {
    flexDirection: "column",
  },
  actionButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  rowActionButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  destructiveButton: {
    backgroundColor: "#C2413A",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  lightActionText: {
    color: COLORS.white,
  },
  cancelText: {
    color: COLORS.textPrimary,
  },
});
