import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

const plans = [
  { id: "1", name: "Monthly Lunch Plan", duration: 30, price: 2499 },
  { id: "2", name: "Weekly Dinner Plan", duration: 7, price: 699 },
];

export default function PlansScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Plan 🍱</Text>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("PlanDetails", { plan: item })}
          >
            <Text style={styles.planName}>{item.name}</Text>
            <Text style={styles.planDetails}>
              {item.duration} Days • ₹{item.price}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  planDetails: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },
});
