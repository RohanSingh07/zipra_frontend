import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

export default function HomeScreen() {
  const todayMeal = {
    name: "Paneer Butter Masala Thali",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
    calories: 650,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Good Afternoon 👋</Text>
      <Text style={styles.subtitle}>Your meal for today</Text>

      <View style={styles.card}>
        <Image source={{ uri: todayMeal.image }} style={styles.image} />
        <View style={styles.cardContent}>
          <Text style={styles.mealName}>{todayMeal.name}</Text>
          <Text style={styles.calories}>
            🔥 {todayMeal.calories} kcal
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Browse Plans</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: SPACING.xl,
  },
  image: {
    height: 180,
    width: "100%",
  },
  cardContent: {
    padding: SPACING.md,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },
  calories: {
    color: COLORS.textSecondary,
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
  },
});