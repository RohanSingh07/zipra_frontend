import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { useState, useEffect } from "react";
import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

const { width } = Dimensions.get("window");

export default function MealDetailsScreen({route,navigation,}: any){

  const mealId =
  route.params?.mealId ||
  route.params?.meal?.id;
  
  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<any>(null);
  const fetchMeal = async (showFullLoader = true) => {
    try {
      if (showFullLoader) setLoading(true);
      const response = await API.get(`/meals/${mealId}/`);

      setMeal(response.data);
      console.log(
        JSON.stringify(
          meal,
          null,
          2
        )
      );
    } catch (error) {
      console.log("MEAL DETAIL ERROR", error);
    } finally {
      if (showFullLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeal();
  }, []);

  const refreshControl = usePullToRefresh(() => fetchMeal(false));

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <Text>
          Meal not found
        </Text>
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView style={styles.container}>
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <FlatList
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  data={meal.images}
  keyExtractor={(item, index) => `${index}`}
  renderItem={({ item }) => (
    <Image
      source={{ uri: item }}
      style={styles.carouselImage}
      resizeMode="cover"
    />
  )}
/>

      <View style={styles.content}>
        <Text style={styles.title}>
          {meal.title}
        </Text>

        <Text style={styles.subtitle}>
          {meal.meal_type}
        </Text>

        {!!meal.description && (
          <Text style={styles.description}>
            {meal.description}
          </Text>
        )}

        <Text style={styles.sectionTitle}>
          Meal Items
        </Text>

        {meal.items.map((item: any) => (
          <View
            key={item.id}
            style={styles.itemCard}
          >
            {item.image && (
              <Image
                source={{
                  uri: item.image,
                }}
                style={styles.itemImage}
              />
            )}
            <Text style={styles.itemTitle}>
              {item.name}
            </Text>

            <Text style={styles.quantityText}>
              {item.quantity_value}{" "}
              {item.quantity_unit}
            </Text>

            {item.nutrients?.length > 0 && (
              <>
                <Text
                  style={styles.subSectionTitle}
                >
                  Nutrition
                </Text>

                <View
                  style={styles.nutritionGrid}
                >
                  {item.nutrients.map(
                    (nutrient: any) => (
                      <View
                        key={
                          nutrient.nutrient_name
                        }
                        style={
                          styles.nutrientCard
                        }
                      >
                        <Text
                          style={
                            styles.nutrientValue
                          }
                        >
                          {nutrient.value}
                          {nutrient.unit}
                        </Text>

                        <Text
                          style={
                            styles.nutrientLabel
                          }
                        >
                          {
                            nutrient.nutrient_name
                          }
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </>
            )}

            {item.ingredients?.length > 0 && (
              <>
                <Text
                  style={styles.subSectionTitle}
                >
                  Ingredients
                </Text>

                {item.ingredients.map(
                  (ingredient: any) => (
                    <Text
                      key={
                        ingredient.ingredient_name
                      }
                      style={
                        styles.ingredientText
                      }
                    >
                      •{" "}
                      {
                        ingredient.ingredient_name
                      }
                    </Text>
                  )
                )}
              </>
            )}
          </View>
        ))}

        <View style={styles.kitchenCard}>
          <Text style={styles.sectionTitle}>
            Served By
          </Text>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={
              false
            }
          >
            {meal.kitchen.images.map(
              (
                image: string,
                index: number
              ) => (
                <Image
                  key={index}
                  source={{
                    uri: image,
                  }}
                  style={
                    styles.kitchenImage
                  }
                />
              )
            )}
          </ScrollView>

          <Text
            style={styles.kitchenName}
          >
            {meal.kitchen.name}
          </Text>

          <Text
            style={styles.ratingText}
          >
            ⭐ {meal.kitchen.avg_rating}
            {" "}
            (
            {
              meal.kitchen
                .total_reviews
            }
            {" "}
            Reviews)
          </Text>

          <Text
            style={styles.locationText}
          >
            {meal.kitchen.location}
          </Text>

          <View
            style={styles.tagContainer}
          >
            {meal.kitchen.tags.map(
              (tag: string) => (
                <View
                  key={tag}
                  style={styles.tag}
                >
                  <Text>{tag}</Text>
                </View>
              )
            )}
          </View>

          <TouchableOpacity
            style={
              styles.viewKitchenButton
            }
            onPress={() =>
              navigation.navigate(
                "RestaurantDetails",
                {
                  restaurant: {
                    slug:
                      meal.kitchen.slug,
                  },
                }
              )
            }
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "600",
              }}
            >
              View Kitchen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: SPACING.lg,
  },

  heroImage: {
    width: width,
    height: 260,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },

  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: "capitalize",
  },

  description: {
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },

  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  itemTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },

  quantityText: {
    color: COLORS.textSecondary,
  },

  subSectionTitle: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    fontWeight: "600",
  },

  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  nutrientCard: {
    backgroundColor:
      COLORS.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    minWidth: 90,
  },

  nutrientValue: {
    fontWeight: "700",
  },

  nutrientLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  ingredientText: {
    marginBottom: 4,
  },

  kitchenCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },

  kitchenImage: {
    width: width - 70,
    height: 200,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.sm,
  },

  kitchenName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: SPACING.md,
  },

  ratingText: {
    marginTop: SPACING.sm,
    fontWeight: "600",
  },

  locationText: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },

  tag: {
    backgroundColor:
      COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },

  viewKitchenButton: {
    backgroundColor:
      COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  itemImage: {
  width: "100%",
  height: 180,
  borderRadius: RADIUS.lg,
  marginBottom: SPACING.md,
},
carouselImage: {
  width: width -10, // or Dimensions.get("window").width - 32
  height: 250,
  borderRadius: 16,
  marginRight: 12,
},
});
