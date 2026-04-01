import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import API from "@/src/api/client";

export default function OTPScreen({ navigation, route }: any) {
  const { phone } = route.params; 
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/verify-otp/", {
        phone: phone,
        otp: otp,
      });

      const { access, user } = res.data;

      // ✅ Centralized login (stores + sets user)
      await login({ user, access });

    } catch (err: any) {
      console.log(err?.response?.data || err.message);
      Alert.alert("Invalid OTP", "The OTP you entered is incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to your phone
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              value={otp}
              onChangeText={setOtp}
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              otp.length !== 6 && { opacity: 0.5 }
            ]}
            disabled={otp.length !== 6 || loading}
            onPress={handleVerify}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Verify & Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    textAlign: "center",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  input: {
    fontSize: 22,
    letterSpacing: 8,
    height: 50,
    textAlign: "center",
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});