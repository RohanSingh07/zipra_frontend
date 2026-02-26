import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

interface Restaurant {
  id: string;
  name: string;
  location: string;
  isSelected: boolean;
  nextMeal: {
    name: string;
    image: string;
  };
  mealOptions: {
    name: string;
    image: string;
  }[];
}

export default function SubscriptionScreen({ navigation }: any){
  const [restaurants, setRestaurants] = useState<Restaurant[]>([
    {
      id: "1",
      name: "Maa Ka Rasoi",
      location: "Sector 62, Noida",
      isSelected: true,
      nextMeal: {
        name: "Paneer Butter Masala",
        image:
          "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
      },
      mealOptions: [
        {
          name: "Paneer Butter Masala",
          image:
            "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
        },
        {
          name: "Rajma Chawal",
          image:
            "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
        },
      ],
    },
    {
      id: "2",
      name: "Healthy Bites",
      location: "Sector 75, Noida",
      isSelected: false,
      nextMeal: {
        name: "Grilled Veg Bowl",
        image:
          "https://images.unsplash.com/photo-1546069901-eacef0df6022",
      },
      mealOptions: [
        {
          name: "Grilled Veg Bowl",
          image:
            "https://images.unsplash.com/photo-1546069901-eacef0df6022",
        },
        {
          name: "Protein Salad",
          image:
            "https://images.unsplash.com/photo-1550304943-4f24f54ddde9",
        },
      ],
    },
    {
      id: "3",
      name: "Home Tadka",
      location: "Sector 18, Noida",
      isSelected: false,
      nextMeal: {
        name: "Dal Tadka Combo",
        image:
          "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
      },
      mealOptions: [
        {
          name: "Dal Tadka Combo",
          image:
            "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
        },
        {
          name: "Chole Bhature",
          image:
            "https://images.unsplash.com/photo-1600628422019-91b4e18dbb63",
        },
      ],
    },
  ]);

  const [expandedRestaurantId, setExpandedRestaurantId] =
    useState<string | null>(null);

  // Select active restaurant
  const handleSelectRestaurant = (id: string) => {
    const updated = restaurants.map((r) => ({
      ...r,
      isSelected: r.id === id,
    }));
    setRestaurants(updated);
  };

  // Change meal
  const handleChangeMeal = (
    restaurantId: string,
    meal: { name: string; image: string }
  ) => {
    const updated = restaurants.map((r) =>
      r.id === restaurantId
        ? { ...r, nextMeal: meal }
        : r
    );
    setRestaurants(updated);
    setExpandedRestaurantId(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Subscriptions 🍱</Text>

        {restaurants.map((restaurant) => (
          <View key={restaurant.id} style={styles.card}>
            
            {/* Header */}
            <TouchableOpacity
              style={[
                styles.header,
                restaurant.isSelected && styles.activeBorder,
              ]}
              onPress={() =>
                handleSelectRestaurant(restaurant.id)
              }
            >
              <View>
                <Text style={styles.name}>
                  {restaurant.name}
                </Text>
                <Text style={styles.location}>
                  {restaurant.location}
                </Text>
              </View>

              {restaurant.isSelected && (
                <Text style={styles.activeText}>
                  ACTIVE
                </Text>
              )}
            </TouchableOpacity>

            {/* Next Meal */}
            <View style={styles.mealContainer}>
              <TouchableOpacity
                  style={styles.mealContainer}
                  onPress={() =>
                    navigation.navigate("MealDetails", {
                      meal: {
                        id: restaurant.id,
                        name: restaurant.nextMeal.name,
                            image: restaurant.nextMeal.image,
                          },
                        })
                      }
                >
                <Image
                  source={{ uri: restaurant.nextMeal.image }}
                  style={styles.mealImage}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTitle}>
                    Next Meal
                  </Text>
                  <Text style={styles.mealName}>
                    {restaurant.nextMeal.name}
                  </Text>
                </View>
            </TouchableOpacity>
            </View>

            {/* Change Meal Dropdown */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() =>
                setExpandedRestaurantId(
                  expandedRestaurantId === restaurant.id
                    ? null
                    : restaurant.id
                )
              }
            >
              <Text style={styles.dropdownText}>
                Change Meal ▼
              </Text>
            </TouchableOpacity>

            {/* Dropdown Options */}
            {expandedRestaurantId === restaurant.id &&
              restaurant.mealOptions.map((meal, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionRow}
                  onPress={() =>
                    handleChangeMeal(restaurant.id, meal)
                  }
                >
                  <Image
                    source={{ uri: meal.image }}
                    style={styles.optionImage}
                  />
                  <Text style={styles.optionText}>
                    {meal.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeBorder: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activeText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  mealContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  mealImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  mealTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  mealName: {
    fontWeight: "600",
  },
  dropdownButton: {
    marginTop: SPACING.sm,
  },
  dropdownText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  optionImage: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  optionText: {
    fontSize: 14,
  },
});