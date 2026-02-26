import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

export default function SearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data (later from API)
  const restaurants = [
    {
      id: "1",
      name: "Maa Ka Rasoi",
      image:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
    },
    {
      id: "2",
      name: "Healthy Bites",
      image:
        "https://images.unsplash.com/photo-1546069901-eacef0df6022",
    },
  ];

  const meals = [
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
  ];

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMeals = meals.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* SEARCH INPUT */}
      <View style={styles.searchRow}>
        <TextInput
          autoFocus
          placeholder="Search for kitchens or meals..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {searchQuery.length === 0 ? (
          <Text style={styles.placeholderText}>
            Start typing to search...
          </Text>
        ) : (
          <>
            {/* RESTAURANTS */}
            {filteredRestaurants.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Kitchens</Text>
                {filteredRestaurants.map((restaurant) => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={styles.resultCard}
                    onPress={() =>
                      navigation.navigate("RestaurantDetails", {
                        restaurant,
                      })
                    }
                  >
                    <Image
                      source={{ uri: restaurant.image }}
                      style={styles.resultImage}
                    />
                    <Text style={styles.resultText}>
                      {restaurant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* MEALS */}
            {filteredMeals.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Meals</Text>
                {filteredMeals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.resultCard}
                    onPress={() =>
                      navigation.navigate("MealDetails", { meal })
                    }
                  >
                    <Image
                      source={{ uri: meal.image }}
                      style={styles.resultImage}
                    />
                    <Text style={styles.resultText}>
                      {meal.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  cancelText: {
    marginLeft: SPACING.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "500",
  },
  placeholderText: {
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
});