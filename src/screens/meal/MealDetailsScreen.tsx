import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

const { width } = Dimensions.get("window");

function uniqueImageUrls(values: unknown[]): string[] {
  const seen = new Set<string>();

  return values.reduce<string[]>((result, value) => {
    if (typeof value !== "string") return result;
    const url = value.trim();
    if (!url || seen.has(url)) return result;
    seen.add(url);
    result.push(url);
    return result;
  }, []);
}

export default function MealDetailsScreen({route,navigation,}: any){

  const mealId =
  route.params?.mealId ||
  route.params?.meal?.id;
  const focusItemId =
  route.params?.focusItemId ||
  route.params?.focus_item_id;
  const searchImageUrl =
    route.params?.searchImage ||
    route.params?.search_image ||
    route.params?.meal?.image ||
    null;
  const isScreenFocused = useIsFocused();
  
  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<any>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [carouselVisible, setCarouselVisible] = useState(true);
  const [highlightedItemId, setHighlightedItemId] = useState<
    number | string | null
  >(null);
  const scrollRef = useRef<ScrollView>(null);
  const carouselRef = useRef<FlatList<string>>(null);
  const contentTopRef = useRef(0);
  const focusHandledRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carouselImages = useMemo(() => {
    const focusedItem = meal?.items?.find(
      (item: any) => String(item.id) === String(focusItemId)
    );

    return uniqueImageUrls([
      searchImageUrl,
      focusedItem?.image,
      ...(Array.isArray(meal?.images) ? meal.images : []),
      ...(Array.isArray(meal?.items)
        ? meal.items.map((item: any) => item?.image)
        : []),
    ]);
  }, [focusItemId, meal, searchImageUrl]);

  const fetchMeal = useCallback(async (showFullLoader = true) => {
    try {
      if (showFullLoader) setLoading(true);
      const response = await API.get(`/meals/${mealId}/`);

      setMeal(response.data);
    } catch (error) {
      console.log("MEAL DETAIL ERROR", error);
    } finally {
      if (showFullLoader) setLoading(false);
    }
  }, [mealId]);

  useEffect(() => {
    focusHandledRef.current = false;
    setHighlightedItemId(null);
    void fetchMeal();

    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [fetchMeal, focusItemId]);

  useEffect(() => {
    setActiveImageIndex(0);
    requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [carouselImages.length, mealId, searchImageUrl]);

  useEffect(() => {
    if (!isScreenFocused || !carouselVisible || carouselImages.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setActiveImageIndex((current) => {
        const next = (current + 1) % carouselImages.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [carouselImages.length, carouselVisible, isScreenFocused]);

  const handleCarouselScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(Math.min(Math.max(nextIndex, 0), carouselImages.length - 1));
  };

  const handleItemLayout = (
    itemId: number | string,
    event: LayoutChangeEvent
  ) => {
    if (
      !focusItemId ||
      focusHandledRef.current ||
      String(itemId) !== String(focusItemId)
    ) {
      return;
    }

    focusHandledRef.current = true;
    const itemY = event.nativeEvent.layout.y;
    scrollTimerRef.current = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(contentTopRef.current + itemY - 18, 0),
        animated: true,
      });
      setHighlightedItemId(itemId);
      highlightTimerRef.current = setTimeout(
        () => setHighlightedItemId(null),
        2800
      );
    }, 160);
  };

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
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      onScroll={(event) => {
        setCarouselVisible(event.nativeEvent.contentOffset.y < 280);
      }}
      scrollEventThrottle={16}
    >
      <View style={styles.carouselContainer}>
        {carouselImages.length > 0 ? (
          <FlatList
            ref={carouselRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            data={carouselImages}
            keyExtractor={(item) => item}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={handleCarouselScrollEnd}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            )}
          />
        ) : (
          <View style={styles.carouselPlaceholder}>
            <Text style={styles.carouselPlaceholderText}>Meal image unavailable</Text>
          </View>
        )}

        {carouselImages.length > 1 ? (
          <>
            <View style={styles.carouselDots}>
              {carouselImages.length <= 10
                ? carouselImages.map((image, index) => (
                    <View
                      key={image}
                      style={[
                        styles.carouselDot,
                        index === activeImageIndex && styles.carouselDotActive,
                      ]}
                    />
                  ))
                : null}
            </View>
            <View style={styles.carouselCounter}>
              <Text style={styles.carouselCounterText}>
                {activeImageIndex + 1} / {carouselImages.length}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View
        style={styles.content}
        onLayout={(event) => {
          contentTopRef.current = event.nativeEvent.layout.y;
        }}
      >
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
            style={[
              styles.itemCard,
              String(highlightedItemId) === String(item.id) &&
                styles.focusedItemCard,
            ]}
            onLayout={(event) => handleItemLayout(item.id, event)}
          >
            {String(highlightedItemId) === String(item.id) ? (
              <View style={styles.searchMatchBadge}>
                <Text style={styles.searchMatchBadgeText}>
                  Matched your search
                </Text>
              </View>
            ) : null}
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
                  searchImage: carouselImages[activeImageIndex] || carouselImages[0],
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

  focusedItemCard: {
    borderWidth: 2,
    borderColor: "#22A447",
    backgroundColor: "#F4FFF6",
    shadowColor: "#166534",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  searchMatchBadge: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#DCFCE7",
  },

  searchMatchBadgeText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
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
carouselContainer: {
  position: "relative",
  width,
  height: 250,
  backgroundColor: "#F3F4F6",
},
carouselImage: {
  width,
  height: 250,
},
carouselPlaceholder: {
  width,
  height: 250,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#F3F4F6",
},
carouselPlaceholderText: {
  color: COLORS.textSecondary,
  fontSize: 13,
  fontWeight: "600",
},
carouselDots: {
  position: "absolute",
  bottom: 14,
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
},
carouselDot: {
  width: 6,
  height: 6,
  marginHorizontal: 3,
  borderRadius: 3,
  backgroundColor: "rgba(255,255,255,0.62)",
},
carouselDotActive: {
  width: 18,
  backgroundColor: "#FFFFFF",
},
carouselCounter: {
  position: "absolute",
  right: 14,
  bottom: 12,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 12,
  backgroundColor: "rgba(17,24,39,0.68)",
},
carouselCounterText: {
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: "800",
},
});