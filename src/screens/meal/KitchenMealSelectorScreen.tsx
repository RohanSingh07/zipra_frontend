import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useState } from "react";

import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

import { COLORS, SPACING, RADIUS } from "../../constants/theme";
const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

export default function KitchenMealSelectorScreen({ route, navigation }: any) {
  const { kitchenSlug, preselectedMealId } = route.params;

  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<any>(null);

  const [selectedMeals, setSelectedMeals] = useState<number[]>([]);

  const totalPrice =
    data?.days
      ?.flatMap((day: any) => day.meals)

      ?.filter((meal: any) => selectedMeals.includes(meal.id))

      ?.reduce(
        (total: number, meal: any) => total + Number(meal.base_price),

        0,
      ) || 0;
  const fetchMeals = async () => {
    try {
      const response = await API.get(`/kitchens/${kitchenSlug}/order-options/`);

      setData(response.data);

      if (preselectedMealId) {
        setSelectedMeals([preselectedMealId]);
      }
    } catch (error) {
      console.log("ORDER OPTIONS ERROR", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const refreshControl = usePullToRefresh(fetchMeals);

  const toggleMeal = (mealId: number) => {
    setSelectedMeals((previous) => {
      if (previous.includes(mealId)) {
        return previous.filter((id) => id !== mealId);
      }

      return [...previous, mealId];
    });
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }
  const mealTypes = [
    "breakfast",
    "lunch",
    "dinner",
    ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={refreshControl}>
        <Text style={styles.header}>{data?.kitchen?.name}</Text>

        <Text style={styles.subHeader}>Select meals for the next 7 days</Text>
        {data?.days?.length === 0 && (
          <View
            style={{
              marginTop: 50,
              alignItems: "center",
            }}
          >
            <Text>No meals available for ordering.</Text>
          </View>
        )}
        {data?.days?.map((day: any) => (
          <View key={day.date}>
            <Text style={styles.date}>{formatDate(day.date)}</Text>

            {mealTypes.map((mealType) => {

  const meals = day.meals.filter(
    (meal: any) =>
      meal.meal_type === mealType
  );

  if (meals.length === 0) {
    return null;
  }

  return (
    <View key={mealType}>

      <Text style={styles.mealTypeHeading}>
        {mealType.charAt(0).toUpperCase() +
          mealType.slice(1)}
      </Text>

      {meals.map((meal: any) => {

        const isSelected =
          selectedMeals.includes(
            meal.id
          );

        return (
          <TouchableOpacity
            key={meal.id}
            style={[
              styles.mealCard,
              isSelected &&
                styles.selectedMealCard,
            ]}
            onPress={() =>
              toggleMeal(meal.id)
            }
          >

            <Image
              source={{
                uri: meal.image,
              }}
              style={styles.image}
            />

            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.title}>
                {meal.title}
              </Text>

              <Text style={styles.price}>
                ₹{meal.base_price}
              </Text>
            </View>

            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.primary}
              />
            )}

          </TouchableOpacity>
        );
      })}
    </View>
  );
})}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text
            style={{
              fontWeight: "700",
            }}
          >
            {selectedMeals.length} Meals Selected
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: COLORS.primary,
              fontWeight: "700",
            }}
          >
            ₹{totalPrice}
          </Text>
        </View>

        <TouchableOpacity
          disabled={selectedMeals.length === 0}
          style={styles.continueButton}
          onPress={() => {
            

            navigation.navigate(
                "OrderCheckout",
                {
                    mealIds: selectedMeals,
                }
                );
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
            }}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 24,

    fontWeight: "700",

    marginTop: 10,
  },

  subHeader: {
    color: COLORS.textSecondary,

    marginBottom: 20,
  },

  date: {
    fontSize: 18,

    fontWeight: "700",

    marginBottom: 12,

    marginTop: 20,
  },

  mealCard: {
    flexDirection: "row",

    backgroundColor: "#fff",

    padding: 12,

    borderRadius: RADIUS.lg,

    marginBottom: 12,
  },

  selectedMealCard: {
    borderWidth: 2,

    borderColor: COLORS.primary,
  },

  image: {
    width: 80,

    height: 80,

    borderRadius: 12,

    marginRight: 12,
  },

  title: {
    fontSize: 16,

    fontWeight: "600",
  },

  footer: {
    paddingVertical: 16,
  },

  continueButton: {
    marginTop: 10,

    backgroundColor: COLORS.primary,

    padding: 16,

    borderRadius: RADIUS.lg,

    alignItems: "center",
  },
  price: {
    marginTop: 4,

    color: COLORS.primary,

    fontWeight: "700",
  },
  mealTypeHeading: {

  fontSize: 16,

  fontWeight: "700",

  marginBottom: 10,

  marginTop: 6,

  color: COLORS.primary,
},
});
