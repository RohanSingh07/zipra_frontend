import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import API from "../../api/client";
import AppButton from "../../components/AppButton";
import { COLORS } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function getApiErrorMessage(error: any, fallback: string) {
  const data = error?.response?.data;

  if (!data) {
    return error?.request
      ? "We could not connect to Zipra. Check your connection and try again."
      : fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.message) {
    return data.message;
  }

  if (data.error) {
    return data.error;
  }

  if (Array.isArray(data.otp)) {
    return data.otp.join(", ");
  }

  if (typeof data.otp === "string") {
    return data.otp;
  }

  return fallback;
}

function getMaskedPhone(phone: string) {
  const localNumber = phone.replace(/\D/g, "").slice(-10);

  if (localNumber.length !== 10) {
    return `+91 ${phone}`;
  }

  return `+91 ${localNumber.slice(0, 2)}••• ••${localNumber.slice(-3)}`;
}

export default function OTPScreen({ route, navigation }: any) {
  const { width } = useWindowDimensions();
  const { phone } = route.params;
  const login = useAuthStore((state) => state.login);
  const otpInputRef = useRef<TextInput>(null);
  const autoSubmittedOtpRef = useRef<string | null>(null);

  const [otp, setOtp] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const isTablet = width >= 768;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 350);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [resendSeconds]);

  useEffect(() => {
    if (!resendMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setResendMessage("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [resendMessage]);

  const verifyOtp = useCallback(
    async (otpToVerify: string = otp) => {
      const cleanOtp = otpToVerify.replace(/\D/g, "").slice(0, OTP_LENGTH);

      if (cleanOtp.length !== OTP_LENGTH) {
        setError("Enter the complete 6-digit OTP.");
        otpInputRef.current?.focus();
        return;
      }

      if (loading) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await API.post("/auth/verify-otp/", {
          phone,
          otp: cleanOtp,
        });

        Keyboard.dismiss();
        await login(response.data);
      } catch (requestError: any) {
        console.warn(
          "OTP verification failed",
          requestError?.response?.data || requestError?.message,
        );

        setError(
          getApiErrorMessage(
            requestError,
            "The OTP is invalid or has expired. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, login, otp, phone],
  );

  useEffect(() => {
    if (
      otp.length !== OTP_LENGTH ||
      loading ||
      autoSubmittedOtpRef.current === otp
    ) {
      return;
    }

    autoSubmittedOtpRef.current = otp;
    void verifyOtp(otp);
  }, [loading, otp, verifyOtp]);

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (digitsOnly !== otp) {
      autoSubmittedOtpRef.current = null;
    }

    setOtp(digitsOnly);

    if (error) {
      setError("");
    }

    if (resendMessage) {
      setResendMessage("");
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Login");
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || resending) {
      return;
    }

    try {
      setResending(true);
      setError("");
      setResendMessage("");

      await API.post("/auth/send-otp/", { phone });

      setOtp("");
      autoSubmittedOtpRef.current = null;
      setResendSeconds(RESEND_SECONDS);
      setResendMessage("A new OTP has been sent.");

      requestAnimationFrame(() => {
        otpInputRef.current?.focus();
      });
    } catch (requestError: any) {
      console.warn(
        "OTP resend failed",
        requestError?.response?.data || requestError?.message,
      );

      setError(
        getApiErrorMessage(
          requestError,
          "We could not resend the OTP. Please try again.",
        ),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.pageContent,
          isTablet && styles.pageContentTablet,
        ]}
      >
        <View
          style={[
            styles.contentShell,
            isTablet && styles.contentShellTablet,
          ]}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back to login"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons name="arrow-back" size={21} color={COLORS.textPrimary} />
            </Pressable>

            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeMark}>
                <Text style={styles.brandBadgeMarkText}>Z</Text>
              </View>
              <Text style={styles.brandBadgeText}>ZIPRA</Text>
            </View>

            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroSection}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark"
                size={29}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
            <Text style={styles.phoneText}>{getMaskedPhone(phone)}</Text>
          </View>

          <View style={styles.otpSection}>
            <Pressable
              onPress={() => otpInputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel="Enter the one-time password"
              style={styles.otpInputArea}
            >
              <View pointerEvents="none" style={styles.otpRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                  const digit = otp[index] || "";
                  const isCurrent =
                    inputFocused &&
                    (index === otp.length ||
                      (otp.length === OTP_LENGTH && index === OTP_LENGTH - 1));

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpSlot,
                        isTablet && styles.otpSlotTablet,
                        isCurrent && styles.otpSlotActive,
                        Boolean(error) && styles.otpSlotError,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{digit}</Text>
                    </View>
                  );
                })}
              </View>

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                importantForAutofill="yes"
                maxLength={OTP_LENGTH}
                caretHidden
                editable={!loading && !resending}
                accessibilityLabel="One-time password"
                accessibilityHint="Enter the 6-digit verification code"
                style={styles.hiddenOtpInput}
              />
            </Pressable>

            <Text style={styles.tapHint}>Tap the code area to enter OTP</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {resendMessage ? (
              <Text style={styles.successText}>{resendMessage}</Text>
            ) : null}

            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn’t receive the code?</Text>

              {resendSeconds > 0 ? (
                <Text style={styles.resendTimer}>
                  Resend in 00:{String(resendSeconds).padStart(2, "0")}
                </Text>
              ) : (
                <Pressable
                  onPress={handleResendOtp}
                  disabled={resending}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.resendButton,
                    pressed && styles.resendButtonPressed,
                  ]}
                >
                  <Text style={styles.resendButtonText}>
                    {resending ? "Sending..." : "Resend OTP"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.actionSection}>
            <AppButton
              title="Verify & Continue"
              onPress={() => void verifyOtp()}
              loading={loading}
              disabled={loading || resending || otp.length !== OTP_LENGTH}
              style={styles.verifyButton}
            />

            <Text style={styles.helperText}>
              The code may take a few seconds to arrive.
            </Text>

            {__DEV__ ? (
              <View style={styles.devHintBox}>
                <Text style={styles.devHint}>Development OTP: 123456</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pageContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: COLORS.background,
  },
  pageContentTablet: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 36,
  },
  contentShell: {
    flex: 1,
    width: "100%",
  },
  contentShellTablet: {
    maxWidth: 620,
    alignSelf: "center",
  },
  topBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
  },
  backButtonPressed: {
    opacity: 0.7,
    backgroundColor: COLORS.secondaryBackground,
  },
  topBarSpacer: {
    width: 42,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  brandBadgeMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  brandBadgeMarkText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },
  brandBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 48,
  },
  securityIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: COLORS.primarySoft,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
    marginTop: 22,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  phoneText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  otpSection: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    marginTop: 42,
  },
  otpInputArea: {
    minHeight: 66,
    position: "relative",
    justifyContent: "center",
  },
  otpRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 9,
  },
  otpSlot: {
    flex: 1,
    maxWidth: 46,
    minWidth: 34,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  otpSlotTablet: {
    maxWidth: 52,
    height: 64,
  },
  otpSlotActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  otpSlotError: {
    borderBottomColor: COLORS.error,
  },
  otpDigit: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: "800",
  },
  hiddenOtpInput: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
    backgroundColor: "transparent",
    opacity: 0.02,
    zIndex: 5,
  },
  tapHint: {
    color: COLORS.placeholder,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  errorBox: {
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  successText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
  resendRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 19,
  },
  resendLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  resendTimer: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  resendButton: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  resendButtonPressed: {
    opacity: 0.65,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  actionSection: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    marginTop: 28,
  },
  verifyButton: {
    minHeight: 54,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 13,
  },
  devHintBox: {
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.secondaryBackground,
  },
  devHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
});