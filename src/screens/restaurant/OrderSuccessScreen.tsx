import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { Ionicons } from "@expo/vector-icons";

export default function OrderSuccessScreen({ navigation, route }: any) {
  const { totalOrders } = route.params;

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={90} color="green" />

      <Text style={styles.title}>Order Placed</Text>

      <Text style={styles.subtitle}>
        {totalOrders} meals scheduled successfully.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
        navigation.getParent()?.navigate(
            "Meals"
        );
        }}
      >
        <Text
          style={{
            color: "#fff",
          }}
        >
          View Deliveries
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.popToTop()}
      >
        <Text>Continue Browsing</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    padding: 24,
  },

  title: {
    fontSize: 28,

    fontWeight: "700",

    marginTop: 20,
  },

  subtitle: {
    marginTop: 10,

    textAlign: "center",
  },

  primaryButton: {
    marginTop: 30,

    backgroundColor: "#ff6b35",

    paddingHorizontal: 30,

    paddingVertical: 15,

    borderRadius: 16,
  },

  secondaryButton: {
    marginTop: 15,
  },
});
