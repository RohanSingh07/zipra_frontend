import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen({ navigation }: any) {
  const userName = "Rohan";
  const address = "Sector 62, Noida";

  const upcomingMeals = [
    {
      id: "1",
      name: "Paneer Thali",
      image:
        "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
    },
    {
      id: "2",
      name: "Rajma Chawal",
      image:
        "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
    },
        {
      id: "3",
      name: "Rajma Chawal",
      image:
        "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
    },
        {
      id: "4",
      name: "Rajma Chawal",
      image:
        "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
    },
  ];

  const restaurants = [
    {
      id: "1",
      name: "Maa Ka Rasoi",
      image:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
      tag: "NEW",
    },
    {
      id: "2",
      name: "Healthy Bites",
      image:
        "https://images.unsplash.com/photo-1546069901-eacef0df6022",
      tag: "50% OFF",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate("AddressSelection")}
            style={styles.userInfo}
          >
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.address}>{address}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons
              name="person-circle-outline"
              size={36}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* UPCOMING MEALS */}
        <Text style={styles.sectionTitle}>Upcoming Meals 🍱</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {upcomingMeals.map((meal) => (
            <TouchableOpacity
                  key={meal.id}
                  style={styles.mealCard}
                  onPress={() =>
                    navigation.navigate("MealDetails", { meal })
                  }
                >
              <Image source={{ uri: meal.image }} style={styles.mealImage} />
              <Text style={styles.mealName}>{meal.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* RESTAURANTS SECTION */}
        <Text style={styles.sectionTitle}>Explore More Kitchens 🍽</Text>
        {restaurants.map((restaurant) => (
        <TouchableOpacity
          key={restaurant.id}
          style={styles.restaurantCard}
          onPress={() =>
            navigation.navigate("RestaurantDetails", { restaurant })
          }
        >
          <Image
            source={{ uri: restaurant.image }}
            style={styles.restaurantImage}
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>
              {restaurant.name}
            </Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {restaurant.tag}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  userInfo: { flex: 1 },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  address: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  mealCard: {
    width: 140,
    marginRight: SPACING.md,
  },
  mealImage: {
    height: 100,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  mealName: {
    fontWeight: "600",
  },
  restaurantCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: SPACING.lg,
  },
  restaurantImage: {
    height: 160,
    width: "100%",
  },
  restaurantInfo: {
    padding: SPACING.md,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tag: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});