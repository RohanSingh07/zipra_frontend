import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { useState } from "react";
import API from "../../api/client";

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10 digit phone number");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/send-otp/", {
        phone: phone,
      });

      console.log("OTP Response:", res.data);

      // Navigate to OTP screen
      navigation.navigate("OTP", { phone });

    } catch (err: any) {
      console.log("FULL ERROR:", err);
      console.log("DATA:", err?.response?.data);
      console.log("STATUS:", err?.response?.status);
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🍱 Zipra</Text>
      <Text style={styles.subtitle}>Ghar jaisa khana, roz.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
          maxLength={10}
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          phone.length !== 10 && { opacity: 0.5 }
        ]}
        disabled={phone.length !== 10 || loading}
        onPress={handleSendOTP}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending OTP..." : "Continue"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  logo: {
    fontSize: 36,
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
    fontSize: 16,
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