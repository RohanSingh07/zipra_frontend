import { Ionicons } from "@expo/vector-icons";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "../../components/ui/AppAlertHost";
import { COLORS } from "../../constants/theme";
import { useLocationStore } from "../../store/locationStore";
import { useUIStore } from "../../store/uiStore";
import {
  DEFAULT_SEARCH_FILTERS,
  SearchDatePreset,
  SearchFilters,
  SearchFoodItem,
  SearchFoodResult,
  SearchKitchen,
  SearchKitchenSummary,
  SearchMeal,
  SearchMealType,
  SearchSort,
  SearchTab,
  useSearchStore,
} from "../../store/searchStore";

const SEARCH_TABS: { id: SearchTab; label: string }[] = [
  { id: "food", label: "Meals" },
  { id: "kitchens", label: "Kitchens" },
];

const SORT_OPTIONS: { id: SearchSort; label: string; note: string }[] = [
  { id: "relevance", label: "Relevance", note: "Best match first" },
  { id: "soonest", label: "Soonest available", note: "Earliest meal first" },
  { id: "rating", label: "Rating", note: "Highest-rated kitchens first" },
  { id: "distance", label: "Distance", note: "Nearest kitchens first" },
];

const DATE_OPTIONS: { id: SearchDatePreset; label: string }[] = [
  { id: "any", label: "Any upcoming day" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "Next 7 days" },
];

const MEAL_TYPE_OPTIONS: { id: SearchMealType; label: string }[] = [
  { id: "", label: "Any meal" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
];

const SEARCH_SUGGESTIONS = [
  {
    label: "Biryani",
    image:
      "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=420&q=82",
  },
  {
    label: "Paneer",
    image:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=420&q=82",
  },
  {
    label: "Dal chawal",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=420&q=82",
  },
  {
    label: "Thali",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=420&q=82",
  },
  {
    label: "High protein",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=420&q=82",
  },
  {
    label: "Homestyle",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=420&q=82",
  },
];

type ResultItem = SearchFoodResult | SearchKitchen;
type VegMode = "off" | "pure-kitchens" | "all-kitchens";

const NON_VEG_PATTERN = /non[ -]?veg|chicken|mutton|fish|egg|seafood|prawn|lamb|keema/i;

const FONT_MEDIUM = "Manrope_500Medium";
const FONT_SEMIBOLD = "Manrope_600SemiBold";
const FONT_BOLD = "Manrope_700Bold";

type KitchenVegSummary = Pick<SearchKitchenSummary, "name" | "tags" | "is_pure_veg" | "has_veg_options">;

function uniqueImageUrls(values: (string | null | undefined)[]): string[] {
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

function resultItemKey(item: ResultItem): string {
  const result = item as SearchFoodResult;
  if (result.result_type === "meal") return `meal-${result.meal.id}`;
  if (result.result_type === "food_item") {
    return `food-item-${result.food_item.id}`;
  }
  return `kitchen-${(item as SearchKitchen).id}`;
}

function kitchenVegSignals(kitchen: KitchenVegSummary) {
  const matchText = [kitchen.name, ...(kitchen.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  const hasNonVegSignal = NON_VEG_PATTERN.test(matchText);
  const isPureVeg =
    kitchen.is_pure_veg === true ||
    (!hasNonVegSignal && /pure[ -]?veg|pure vegetarian|vegetarian only/i.test(matchText));
  const hasVegOptions =
    kitchen.has_veg_options === true ||
    isPureVeg ||
    /(^|\s)veg(etarian|an)?(\s|$)/i.test(matchText);

  return { isPureVeg, hasVegOptions };
}

function resultMatchesVegPreference(
  item: ResultItem,
  tab: SearchTab,
  vegMode: VegMode
): boolean {
  if (vegMode === "off") return true;

  if (tab === "kitchens") {
    const kitchen = item as SearchKitchen;
    const signals = kitchenVegSignals(kitchen);
    return vegMode === "pure-kitchens"
      ? signals.isPureVeg
      : signals.hasVegOptions;
  }

  const result = item as SearchFoodResult;
  const foodText =
    result.result_type === "meal"
      ? [
          result.meal.title,
          result.meal.description,
          ...(result.meal.matched_items ?? []).map((matchedItem) => matchedItem.name),
        ]
          .filter(Boolean)
          .join(" ")
      : [result.food_item.name, result.food_item.description]
          .filter(Boolean)
          .join(" ");

  if (NON_VEG_PATTERN.test(foodText)) return false;
  if (vegMode === "all-kitchens") return true;

  const kitchen =
    result.result_type === "meal"
      ? result.meal.kitchen
      : result.food_item.kitchen;
  return kitchenVegSignals(kitchen).isPureVeg;
}

function asNumber(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: string | number): string {
  const parsed = asNumber(value);
  if (parsed === null) return `₹${value}`;
  return `₹${Math.round(parsed)}`;
}

function formatRating(value?: string | number | null): string {
  const parsed = asNumber(value);
  return parsed === null ? "New" : parsed.toFixed(1);
}

function formatMealType(value?: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSearchDate(value?: string): string {
  if (!value) return "";
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return value;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function dateFilterLabel(value: SearchDatePreset): string {
  return DATE_OPTIONS.find((option) => option.id === value)?.label ?? "Date";
}

function sortLabel(value: SearchSort): string {
  return SORT_OPTIONS.find((option) => option.id === value)?.label ?? "Sort";
}

function getFilterCount(filters: SearchFilters): number {
  return (
    Number(filters.sort !== "relevance") +
    Number(filters.mealType !== "") +
    Number(filters.datePreset !== "any") +
    Number(filters.offersOnly)
  );
}

function ResultImage({ uri, icon }: { uri?: string | null; icon: "restaurant" | "fast-food" }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.resultImage} resizeMode="cover" />;
  }

  return (
    <View style={[styles.resultImage, styles.imagePlaceholder]}>
      <Ionicons name={`${icon}-outline`} size={30} color={COLORS.primary} />
    </View>
  );
}

function ResultVisual({
  uri,
  images,
  icon,
  offerLabel,
  price,
  autoPlay = false,
}: {
  uri?: string | null;
  images?: string[];
  icon: "restaurant" | "fast-food";
  offerLabel?: string;
  price?: string | number | null;
  autoPlay?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const carouselWidth = Math.max(screenWidth - 32, 1);
  const carouselHeight = Math.min(
    Math.max(Math.round(carouselWidth * 0.92), 230),
    250
  );
  const carouselRef = useRef<FlatList<string>>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const carouselImages = useMemo(
    () => uniqueImageUrls([uri, ...(images ?? [])]),
    [images, uri]
  );
  const carouselIdentity = carouselImages.join("|");

  useEffect(() => {
    setActiveImageIndex(0);
    requestAnimationFrame(() => {
      carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [carouselIdentity]);

  useEffect(() => {
    if (!autoPlay || carouselImages.length < 2) return;

    const timer = setInterval(() => {
      setActiveImageIndex((current) => {
        const next = (current + 1) % carouselImages.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [autoPlay, carouselImages.length]);

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const next = Math.round(
      event.nativeEvent.contentOffset.x / carouselWidth
    );
    setActiveImageIndex(
      Math.min(Math.max(next, 0), carouselImages.length - 1)
    );
  };

  return (
    <View style={[styles.resultVisual, { height: carouselHeight }]}>
      {carouselImages.length > 0 ? (
        <FlatList
          ref={carouselRef}
          data={carouselImages}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(image) => image}
          getItemLayout={(_, index) => ({
            length: carouselWidth,
            offset: carouselWidth * index,
            index,
          })}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollToIndexFailed={({ index }) => {
            carouselRef.current?.scrollToOffset({
              offset: carouselWidth * index,
              animated: true,
            });
          }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={[
                styles.resultImage,
                { width: carouselWidth, height: carouselHeight },
              ]}
              resizeMode="cover"
            />
          )}
        />
      ) : (
        <ResultImage icon={icon} />
      )}
      {carouselImages.length > 1 ? (
        carouselImages.length <= 8 ? (
          <View style={styles.resultImageDots}>
            {carouselImages.map((image, index) => (
              <View
                key={image}
                style={[
                  styles.resultImageDot,
                  index === activeImageIndex && styles.resultImageDotActive,
                ]}
              />
            ))}
          </View>
        ) : null
      ) : null}
      {offerLabel ? (
        <View style={styles.imageOfferBadge}>
          <View style={styles.imageOfferPercentIcon}>
            <Text style={styles.imageOfferPercentText}>%</Text>
          </View>
          <Text style={styles.imageOfferText} numberOfLines={1}>
            {offerLabel}
          </Text>
        </View>
      ) : null}
      {price !== null && price !== undefined && price !== "" ? (
        <View style={styles.imagePriceBadge}>
          <Text style={styles.imagePriceText}>{formatPrice(price)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PriceDetail({
  value,
  context,
}: {
  value?: string | number | null;
  context: string;
}) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <View style={styles.priceDetailRow}>
      <Text style={styles.priceValue}>{formatPrice(value)}</Text>
      <Text style={styles.priceContext}>{context}</Text>
    </View>
  );
}

function RatingBadge({ value }: { value?: string | number | null }) {
  return (
    <View style={styles.ratingBadge}>
      <Ionicons name="star" size={11} color={COLORS.white} />
      <Text style={styles.ratingBadgeText}>{formatRating(value)}</Text>
    </View>
  );
}

function KitchenTags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;

  return (
    <View style={styles.tagSection}>
      <View style={styles.tagRow}>
        {tags.slice(0, 3).map((tag, index) => (
          <View key={`${tag}-${index}`} style={styles.greenTag}>
            <Text style={styles.greenTagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MealResultCard({
  meal,
  onPress,
  autoPlay,
}: {
  meal: SearchMeal;
  onPress: () => void;
  autoPlay: boolean;
}) {
  const firstOffer = meal.offers?.[0];
  const matchedItems = meal.matched_items ?? [];

  return (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.82} onPress={onPress}>
      <ResultVisual
        uri={meal.image}
        images={meal.images}
        icon="fast-food"
        offerLabel={firstOffer}
        price={meal.base_price}
        autoPlay={autoPlay}
      />
      <View style={styles.resultCardBody}>
        <View style={styles.resultTitleRow}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {meal.title}
          </Text>
          <RatingBadge value={meal.kitchen?.avg_rating} />
        </View>

        <View style={styles.kitchenLine}>
          <Text style={styles.kitchenName} numberOfLines={1}>
            {meal.kitchen_name}
          </Text>
          {meal.distance_km !== null && meal.distance_km !== undefined ? (
            <Text style={styles.distanceText}>· {meal.distance_km} km</Text>
          ) : null}
        </View>

        {matchedItems.length > 0 ? (
          <View style={styles.matchPanel}>
            <Text style={styles.matchLabel}>MATCHED INSIDE THIS MEAL</Text>
            <Text style={styles.matchValue} numberOfLines={1}>
              {matchedItems.map((item) => item.name).join(" · ")}
            </Text>
          </View>
        ) : null}

        <View style={styles.availabilityRow}>
          <View style={styles.availableDot} />
          <Text style={styles.availabilityText}>
            {meal.availability_label} · {formatMealType(meal.meal_type)}
          </Text>
        </View>

        <KitchenTags tags={meal.kitchen?.tags} />

        <PriceDetail
          value={meal.kitchen?.average_cost_for_two}
          context="Average cost for two"
        />

      </View>
    </TouchableOpacity>
  );
}

function FoodItemResultCard({
  item,
  onPress,
  autoPlay,
}: {
  item: SearchFoodItem;
  onPress: () => void;
  autoPlay: boolean;
}) {
  const isScheduled = item.availability_status === "scheduled";
  const quantity = [item.quantity_value, item.quantity_unit].filter(Boolean).join(" ");

  return (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.82} onPress={onPress}>
      <ResultVisual
        uri={item.image}
        images={item.images}
        icon="fast-food"
        offerLabel={item.offers?.[0]}
        price={item.next_meal?.base_price}
        autoPlay={autoPlay}
      />
      <View style={styles.resultCardBody}>
        <View style={styles.resultTitleRow}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.name}
          </Text>
          {quantity ? <Text style={styles.quantityText}>{quantity}</Text> : null}
          <RatingBadge value={item.kitchen?.avg_rating} />
        </View>

        <View style={styles.kitchenLine}>
          <Text style={styles.kitchenName} numberOfLines={1}>
            {item.kitchen_name}
          </Text>
          {item.distance_km !== null && item.distance_km !== undefined ? (
            <Text style={styles.distanceText}>· {item.distance_km} km</Text>
          ) : null}
        </View>

        <View style={[styles.itemAvailability, !isScheduled && styles.itemAvailabilityMuted]}>
          <Ionicons
            name={isScheduled ? "calendar" : "time-outline"}
            size={14}
            color={isScheduled ? "#15803D" : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.itemAvailabilityText,
              !isScheduled && styles.itemAvailabilityTextMuted,
            ]}
            numberOfLines={2}
          >
            {item.availability_label}
          </Text>
        </View>

        {item.times_served > 0 ? (
          <Text style={styles.frequencyText}>
            Served {item.times_served} {item.times_served === 1 ? "time" : "times"} in the last 90 days
          </Text>
        ) : null}

        <KitchenTags tags={item.kitchen?.tags} />

        <PriceDetail
          value={item.kitchen?.average_cost_for_two}
          context="Average cost for two"
        />

        {!isScheduled ? (
          <View style={styles.cardActionRow}>
            <Text style={styles.cardActionText}>View kitchen</Text>
            <View style={styles.cardActionIcon}>
              <Ionicons name="arrow-forward" size={15} color={COLORS.primaryDark} />
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function KitchenResultCard({
  kitchen,
  onPress,
  autoPlay,
}: {
  kitchen: SearchKitchen;
  onPress: () => void;
  autoPlay: boolean;
}) {
  const nextMeal = kitchen.earliest_matching_meal;
  const matchedFood =
    nextMeal?.matched_items?.[0]?.name ??
    kitchen.frequently_served_items?.[0]?.name;

  return (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.82} onPress={onPress}>
      <ResultVisual
        uri={kitchen.image}
        images={kitchen.images}
        icon="restaurant"
        offerLabel={kitchen.offers?.[0]}
        price={nextMeal?.base_price}
        autoPlay={autoPlay}
      />
      <View style={styles.resultCardBody}>
        <View style={styles.resultTitleRow}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {kitchen.name}
          </Text>
          <View style={styles.kitchenRatingBlock}>
            <RatingBadge value={kitchen.avg_rating} />
            {kitchen.total_reviews ? (
              <Text style={styles.reviewCount}>({kitchen.total_reviews})</Text>
            ) : null}
          </View>
        </View>

        {kitchen.match_reason ? (
          <View style={styles.matchReasonRow}>
            <Ionicons
              name={nextMeal ? "calendar-outline" : "repeat-outline"}
              size={15}
              color="#15803D"
            />
            <Text style={styles.matchReasonText} numberOfLines={2}>
              {matchedFood ? `${matchedFood} match` : kitchen.match_reason}
              {nextMeal
                ? ` · ${formatMealType(nextMeal.meal_type)} on ${formatSearchDate(nextMeal.date)}`
                : matchedFood
                  ? " · Frequently served here"
                  : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {kitchen.location || "Location available in kitchen details"}
          </Text>
          {kitchen.distance_km !== null && kitchen.distance_km !== undefined ? (
            <Text style={styles.distanceText}>· {kitchen.distance_km} km</Text>
          ) : null}
        </View>

        <KitchenTags tags={kitchen.tags} />

        <PriceDetail
          value={kitchen.average_cost_for_two}
          context="Average cost for two"
        />
      </View>
    </TouchableOpacity>
  );
}

function FilterSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: SearchFilters;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const updateDraft = <K extends keyof SearchFilters>(key: K, next: SearchFilters[K]) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Search filters</Text>
              <Text style={styles.sheetSubtitle}>Prioritise what matters for this meal.</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>Sort results</Text>
            <View style={styles.optionStack}>
              {SORT_OPTIONS.map((option) => {
                const selected = draft.sort === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.sortOption, selected && styles.sortOptionSelected]}
                    onPress={() => updateDraft("sort", option.id)}
                  >
                    <View style={styles.sortOptionCopy}>
                      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.optionNote}>{option.note}</Text>
                    </View>
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={21}
                      color={selected ? COLORS.primary : "#C8BDB5"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.filterSectionTitle}>When do you want it?</Text>
            <View style={styles.optionWrap}>
              {DATE_OPTIONS.map((option) => {
                const selected = draft.datePreset === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                    onPress={() => updateDraft("datePreset", option.id)}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.filterSectionTitle}>Meal time</Text>
            <View style={styles.optionWrap}>
              {MEAL_TYPE_OPTIONS.map((option) => {
                const selected = draft.mealType === option.id;
                return (
                  <TouchableOpacity
                    key={option.id || "any"}
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                    onPress={() => updateDraft("mealType", option.id)}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.offerSwitchRow}>
              <View style={styles.offerSwitchCopy}>
                <View style={styles.offerSwitchIcon}>
                  <Ionicons name="pricetag" size={17} color="#9A3412" />
                </View>
                <View>
                  <Text style={styles.offerSwitchTitle}>Offers only</Text>
                  <Text style={styles.offerSwitchSubtitle}>Show results with a live offer</Text>
                </View>
              </View>
              <Switch
                value={draft.offersOnly}
                onValueChange={(next) => updateDraft("offersOnly", next)}
                trackColor={{ false: "#D8D1CB", true: "#FDBA74" }}
                thumbColor={draft.offersOnly ? COLORS.primaryDark : COLORS.white}
              />
            </View>
          </ScrollView>

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setDraft(DEFAULT_SEARCH_FILTERS)}
            >
              <Text style={styles.clearButtonText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => onApply(draft)}>
              <Text style={styles.applyButtonText}>Show results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SearchScreen({ navigation, route }: any) {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  const initialQuery = route.params?.initialQuery ?? "";
  const isScreenFocused = useIsFocused();
  const selectedLocation = useLocationStore((state) => state.selectedLocation);
  const query = useSearchStore((state) => state.query);
  const activeTab = useSearchStore((state) => state.activeTab);
  const filters = useSearchStore((state) => state.filters);
  const response = useSearchStore((state) => state.response);
  const loading = useSearchStore((state) => state.loading);
  const refreshing = useSearchStore((state) => state.refreshing);
  const loadingMore = useSearchStore((state) => state.loadingMore);
  const errorMessage = useSearchStore((state) => state.errorMessage);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setActiveTab = useSearchStore((state) => state.setActiveTab);
  const setFilters = useSearchStore((state) => state.setFilters);
  const clearResults = useSearchStore((state) => state.clearResults);
  const addRecentSearch = useSearchStore((state) => state.addRecentSearch);
  const removeRecentSearch = useSearchStore((state) => state.removeRecentSearch);
  const clearRecentSearches = useSearchStore((state) => state.clearRecentSearches);
  const search = useSearchStore((state) => state.search);
  const loadMore = useSearchStore((state) => state.loadMore);
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [vegMode, setVegMode] = useState<VegMode>("off");
  const [visibleResultKeys, setVisibleResultKeys] = useState<Set<string>>(
    () => new Set()
  );
  const inputRef = useRef<TextInput>(null);
  const initialisedRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const resultViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
  }).current;
  const onResultViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ResultItem>[] }) => {
      setVisibleResultKeys(
        new Set(
          viewableItems
            .map(({ item }) => item)
            .filter(Boolean)
            .map(resultItemKey)
        )
      );
    }
  ).current;

  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    setQuery(initialQuery);
    if (initialQuery.trim()) addRecentSearch(initialQuery);
  }, [addRecentSearch, initialQuery, setQuery]);

  useEffect(() => {
    if (!query.trim()) {
      clearResults();
      return;
    }

    const timer = setTimeout(() => {
      void search(selectedLocation);
    }, 380);

    return () => clearTimeout(timer);
  }, [activeTab, clearResults, filters, query, search, selectedLocation]);

  useEffect(() => {
    setVisibleResultKeys(new Set());
    lastScrollYRef.current = 0;
    setTabBarVisible(true);
  }, [activeTab, query, setTabBarVisible]);

  useFocusEffect(
    useCallback(() => {
      lastScrollYRef.current = 0;
      setTabBarVisible(true);

      return () => setTabBarVisible(true);
    }, [setTabBarVisible])
  );

  const handleSearchScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
    const scrollDelta = offsetY - lastScrollYRef.current;

    if (offsetY <= 8 || scrollDelta < -1) {
      setTabBarVisible(true);
    } else if (offsetY > 28 && scrollDelta > 3) {
      setTabBarVisible(false);
    }

    lastScrollYRef.current = offsetY;
  };

  const counts = response?.counts ?? { food: 0, meals: 0, food_items: 0, kitchens: 0 };
  const totalCount = counts.food + counts.kitchens;
  const activeFilterCount = getFilterCount(filters);

  const typedResults = useMemo<ResultItem[]>(() => {
    if (!response) return [];
    const results = activeTab === "food" ? response.food_results : response.kitchens;
    return vegMode !== "off"
      ? results.filter((item) => resultMatchesVegPreference(item, activeTab, vegMode))
      : results;
  }, [activeTab, response, vegMode]);

  const rememberAndNavigateToMeal = (meal: SearchMeal) => {
    addRecentSearch(query);
    Keyboard.dismiss();
    navigation.navigate("MealDetails", {
      mealId: meal.navigation?.meal_id ?? meal.id,
      focusItemId:
        meal.navigation?.focus_item_id ?? meal.matched_items?.[0]?.id,
      searchImage: meal.image,
    });
  };

  const rememberAndNavigateToItem = (item: SearchFoodItem) => {
    addRecentSearch(query);
    Keyboard.dismiss();
    if (item.navigation?.screen === "MealDetails" && item.navigation.meal_id) {
      navigation.navigate("MealDetails", {
        mealId: item.navigation.meal_id,
        focusItemId: item.navigation.focus_item_id ?? item.id,
        searchImage: item.image,
      });
      return;
    }

    navigation.navigate("RestaurantDetails", {
      restaurant: {
        id: item.kitchen?.id,
        slug: item.navigation?.kitchen_slug ?? item.kitchen_slug,
        name: item.kitchen_name,
      },
      searchImage: item.image,
    });
  };

  const rememberAndNavigateToKitchen = (kitchen: SearchKitchen) => {
    addRecentSearch(query);
    Keyboard.dismiss();
    navigation.navigate("RestaurantDetails", {
      restaurant: kitchen,
      searchImage: kitchen.image,
    });
  };

  const selectSearch = (value: string) => {
    addRecentSearch(value);
    setQuery(value);
    Keyboard.dismiss();
  };

  const submitSearch = () => {
    addRecentSearch(query);
    Keyboard.dismiss();
  };

  const handleVoiceSearch = () => {
    showAppAlert(
      "Voice search",
      "The microphone is ready in the search design. Native voice recognition will be connected when we move from Expo Go to the development build."
    );
  };

  const handleVegSwitch = (enabled: boolean) => {
    if (!enabled) {
      setVegMode("off");
      return;
    }

    showAppAlert(
      "Choose your Veg preference",
      "Would you like kitchens that are completely vegetarian, or vegetarian options from every kitchen?",
      [
        {
          text: "Pure veg kitchens",
          onPress: () => setVegMode("pure-kitchens"),
        },
        {
          text: "Veg options from all kitchens",
          onPress: () => setVegMode("all-kitchens"),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const renderTypedItem = ({ item }: { item: ResultItem }) => {
    if (activeTab === "food") {
      const foodResult = item as SearchFoodResult;
      if (foodResult.result_type === "meal") {
        const itemKey = resultItemKey(foodResult);
        return (
          <MealResultCard
            meal={foodResult.meal}
            onPress={() => rememberAndNavigateToMeal(foodResult.meal)}
            autoPlay={
              isScreenFocused && visibleResultKeys.has(itemKey)
            }
          />
        );
      }
      const itemKey = resultItemKey(foodResult);
      return (
        <FoodItemResultCard
          item={foodResult.food_item}
          onPress={() => rememberAndNavigateToItem(foodResult.food_item)}
          autoPlay={
            isScreenFocused && visibleResultKeys.has(itemKey)
          }
        />
      );
    }
    const kitchen = item as SearchKitchen;
    const itemKey = resultItemKey(kitchen);
    return (
      <KitchenResultCard
        kitchen={kitchen}
        onPress={() => rememberAndNavigateToKitchen(kitchen)}
        autoPlay={
          isScreenFocused && visibleResultKeys.has(itemKey)
        }
      />
    );
  };

  const refresh = () => search(selectedLocation, { refresh: true });

  const renderInitialState = () => (
    <ScrollView
      contentContainerStyle={styles.discoveryContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={handleSearchScroll}
      scrollEventThrottle={16}
    >
      {recentSearches.length > 0 ? (
        <View style={styles.discoverySection}>
          <View style={styles.recentHeader}>
            <Text style={styles.discoverySectionTitle}>Recent searches</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearRecentText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentGrid}>
            {recentSearches.slice(0, 7).map((item) => (
              <View key={item} style={styles.recentCard}>
                <TouchableOpacity
                  style={styles.recentTapArea}
                  activeOpacity={0.76}
                  onPress={() => selectSearch(item)}
                >
                  <View style={styles.recentIconWrap}>
                    <Ionicons name="time-outline" size={16} color={COLORS.primaryDark} />
                  </View>
                  <Text style={styles.recentText} numberOfLines={1}>
                    {item}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeRecentButton}
                  onPress={() => removeRecentSearch(item)}
                >
                  <Ionicons name="close" size={15} color="#9C8D84" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.discoverySection}>
        <View style={styles.suggestionHeader}>
          <View>
            <Text style={styles.discoverySectionTitle}>Try searching for</Text>
            <Text style={styles.discoverySectionSubtitle}>Popular meals around you</Text>
          </View>
          <Ionicons name="sparkles" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.suggestionList}>
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.label}
              style={styles.suggestionCard}
              activeOpacity={0.8}
              onPress={() => selectSearch(suggestion.label)}
            >
              <Image source={{ uri: suggestion.image }} style={styles.suggestionImage} />
              <View style={styles.suggestionCardFooter}>
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {suggestion.label}
                </Text>
                <View style={styles.suggestionArrow}>
                  <Ionicons name="arrow-forward" size={13} color={COLORS.primaryDark} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderResultsBody = () => {
    if (!query.trim()) return renderInitialState();

    if (loading && !response) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerStateTitle}>Searching upcoming meals…</Text>
          <Text style={styles.centerStateSubtitle}>Checking dates, meal items, and kitchens near you.</Text>
        </View>
      );
    }

    if (errorMessage && !response) {
      return (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, styles.errorStateIcon]}>
            <Ionicons name="cloud-offline-outline" size={29} color={COLORS.error} />
          </View>
          <Text style={styles.centerStateTitle}>Search could not be loaded</Text>
          <Text style={styles.centerStateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void search(selectedLocation)}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (response && totalCount === 0) {
      return (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="search-outline" size={30} color={COLORS.primaryDark} />
          </View>
          <Text style={styles.centerStateTitle}>Nothing scheduled for “{query.trim()}”</Text>
          <Text style={styles.centerStateSubtitle}>
            Try a broader meal name, remove a filter, or search for a kitchen.
          </Text>
          {activeFilterCount > 0 ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setFilters(DEFAULT_SEARCH_FILTERS)}
            >
              <Text style={styles.retryButtonText}>Clear filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    if (response && typedResults.length === 0) {
      if (vegMode !== "off") {
        return (
          <View style={styles.centerState}>
            <View style={[styles.stateIcon, styles.vegStateIcon]}>
              <Ionicons name="leaf-outline" size={30} color="#15803D" />
            </View>
            <Text style={styles.centerStateTitle}>No vegetarian matches here</Text>
            <Text style={styles.centerStateSubtitle}>
              Turn off Veg to see every result for “{query.trim()}”.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setVegMode("off")}>
              <Text style={styles.retryButtonText}>Show all results</Text>
            </TouchableOpacity>
          </View>
        );
      }

      const label = SEARCH_TABS.find((tab) => tab.id === activeTab)?.label.toLowerCase();
      const otherTab: SearchTab = activeTab === "food" ? "kitchens" : "food";
      const otherLabel = otherTab === "food" ? "meals" : "kitchens";
      return (
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="search-outline" size={30} color={COLORS.primaryDark} />
          </View>
          <Text style={styles.centerStateTitle}>No matching {label}</Text>
          <Text style={styles.centerStateSubtitle}>
            Try the {otherLabel} results or adjust your filters.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setActiveTab(otherTab)}>
            <Text style={styles.retryButtonText}>View {otherLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={typedResults}
        keyExtractor={resultItemKey}
        renderItem={renderTypedItem}
        extraData={`${isScreenFocused}:${Array.from(visibleResultKeys).join("|")}`}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
        }
        onEndReached={() => void loadMore(selectedLocation)}
        onEndReachedThreshold={0.35}
        onScroll={handleSearchScroll}
        scrollEventThrottle={16}
        viewabilityConfig={resultViewabilityConfig}
        onViewableItemsChanged={onResultViewableItemsChanged}
        ListFooterComponent={
          <View style={styles.listFooter}>
            {loadingMore ? <ActivityIndicator color={COLORS.primary} /> : null}
            {errorMessage && response ? <Text style={styles.loadMoreError}>{errorMessage}</Text> : null}
          </View>
        }
      />
    );
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.fontLoadingState}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topArea}>
        <View style={styles.addressRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationButton}
            activeOpacity={0.72}
            onPress={() => navigation.navigate("AddressSelection")}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={17} color={COLORS.primaryDark} />
            </View>
            <View style={styles.locationCopy}>
              <Text style={styles.locationEyebrow}>DELIVER TO</Text>
              <View style={styles.locationTitleRow}>
                <Text style={styles.locationTitle} numberOfLines={1}>
                  {selectedLocation?.label ?? "Choose delivery location"}
                </Text>
                <Ionicons name="chevron-down" size={15} color={COLORS.textPrimary} />
              </View>
              {selectedLocation?.formattedAddress ? (
                <Text style={styles.locationSubtitle} numberOfLines={1}>
                  {selectedLocation.formattedAddress}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              ref={inputRef}
              autoFocus={!initialQuery}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              placeholder="Search meals or kitchens"
              placeholderTextColor={COLORS.placeholder}
              returnKeyType="search"
              autoCorrect={false}
              style={styles.searchInput}
            />
            {query ? (
              <TouchableOpacity style={styles.clearSearchButton} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={20} color="#B8AAA1" />
              </TouchableOpacity>
            ) : null}
            <View style={styles.searchDivider} />
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={handleVoiceSearch}
              accessibilityRole="button"
              accessibilityLabel="Search using your voice"
            >
              <Ionicons name="mic" size={21} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.vegSwitchCard,
              vegMode !== "off" && styles.vegSwitchCardActive,
            ]}
          >
            <View style={styles.vegSwitchCopy}>
              <View style={styles.vegDot} />
              <Text style={styles.vegSwitchLabel}>Veg</Text>
            </View>
            <Switch
              style={styles.vegSwitch}
              value={vegMode !== "off"}
              onValueChange={handleVegSwitch}
              trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
              thumbColor={vegMode !== "off" ? "#15803D" : "#F9FAFB"}
            />
          </View>
        </View>

        {query.trim() ? (
          <>
            <View style={styles.tabRow}>
              {SEARCH_TABS.map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabButton, selected && styles.tabButtonSelected]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              keyboardShouldPersistTaps="handled"
            >
          <TouchableOpacity
            style={[styles.filterChip, activeFilterCount > 0 && styles.filterChipSelected]}
            onPress={() => setFiltersVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={activeFilterCount > 0 ? COLORS.primaryDark : COLORS.textPrimary}
            />
            <Text style={[styles.filterChipText, activeFilterCount > 0 && styles.filterChipTextSelected]}>
              Filters{activeFilterCount ? ` ${activeFilterCount}` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip} onPress={() => setFiltersVisible(true)}>
            <Text style={styles.filterChipText}>{sortLabel(filters.sort)}</Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {filters.datePreset !== "any" ? (
            <TouchableOpacity style={styles.filterChipSelected} onPress={() => setFiltersVisible(true)}>
              <Text style={styles.filterChipTextSelected}>{dateFilterLabel(filters.datePreset)}</Text>
            </TouchableOpacity>
          ) : null}

          {filters.mealType ? (
            <TouchableOpacity style={styles.filterChipSelected} onPress={() => setFiltersVisible(true)}>
              <Text style={styles.filterChipTextSelected}>{formatMealType(filters.mealType)}</Text>
            </TouchableOpacity>
          ) : null}

          {filters.offersOnly ? (
            <TouchableOpacity
              style={styles.filterChipSelected}
              onPress={() => setFilters({ ...filters, offersOnly: false })}
            >
              <Ionicons name="pricetag" size={13} color={COLORS.primaryDark} />
              <Text style={styles.filterChipTextSelected}>Offers</Text>
              <Ionicons name="close" size={13} color={COLORS.primaryDark} />
            </TouchableOpacity>
          ) : null}
            </ScrollView>
          </>
        ) : null}
      </View>

      <View style={styles.body}>{renderResultsBody()}</View>

      <FilterSheet
        visible={filtersVisible}
        value={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  fontLoadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topArea: {
    paddingTop: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    backgroundColor: COLORS.white,
  },
  addressRow: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 5,
  },
  backButton: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
  },
  locationButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  locationIconWrap: {
    width: 30,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFF3E9",
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },
  locationEyebrow: {
    color: COLORS.primaryDark,
    fontSize: 8,
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: 1,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  locationTitle: {
    flexShrink: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: -0.2,
  },
  locationSubtitle: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: FONT_MEDIUM,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 15,
    paddingRight: 5,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 19,
    backgroundColor: COLORS.white,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 9,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONT_SEMIBOLD,
  },
  clearSearchButton: {
    width: 31,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  voiceButton: {
    width: 42,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  vegSwitchCard: {
    width: 52,
    height: 54,
    paddingTop: 4,
    paddingBottom: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.white,
  },
  vegSwitchCardActive: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  vegSwitchCopy: {
    marginBottom: -5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    transform: [{ translateY: 3 }],
  },
  vegDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  vegSwitchLabel: {
    color: "#15803D",
    fontSize: 9,
    fontFamily: FONT_SEMIBOLD,
  },
  vegSwitch: {
    marginTop: -3,
    transform: [{ scaleX: 0.66 }, { scaleY: 0.66 }],
  },
  tabRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: "#F6F1ED",
  },
  tabButtonSelected: {
    backgroundColor: COLORS.primaryDark,
  },
  tabText: {
    color: "#675950",
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  tabTextSelected: {
    color: COLORS.white,
  },
  filterRow: {
    gap: 7,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 11,
  },
  filterChip: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#E0D6CF",
    borderRadius: 11,
    backgroundColor: COLORS.white,
  },
  filterChipSelected: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 11,
    backgroundColor: "#FFF0E3",
  },
  filterChipText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontFamily: FONT_SEMIBOLD,
  },
  filterChipTextSelected: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontFamily: FONT_SEMIBOLD,
  },
  body: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 110,
  },
  resultCard: {
    width: "100%",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EDE3DB",
    borderRadius: 21,
    backgroundColor: COLORS.white,
    shadowColor: "#5B3A25",
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: "hidden",
  },
  resultVisual: {
    width: "100%",
    backgroundColor: COLORS.primarySoft,
  },
  resultImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.primarySoft,
  },
  resultImageDots: {
    position: "absolute",
    top: 11,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  resultImageDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
  },
  resultImageDotActive: {
    width: 14,
    backgroundColor: COLORS.white,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageOfferBadge: {
    position: "absolute",
    left: 11,
    bottom: 11,
    maxWidth: "60%",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(35, 27, 22, 0.76)",
  },
  imageOfferText: {
    flexShrink: 1,
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  imageOfferPercentIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
  },
  imageOfferPercentText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONT_SEMIBOLD,
    lineHeight: 13,
  },
  imagePriceBadge: {
    position: "absolute",
    right: 11,
    bottom: 11,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(35, 27, 22, 0.82)",
  },
  imagePriceText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONT_BOLD,
  },
  resultCardBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: -0.15,
  },
  quantityText: {
    marginLeft: 10,
    marginRight: 8,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  availableDot: {
    width: 7,
    height: 7,
    marginRight: 5,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  availabilityText: {
    color: "#166534",
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
  },
  matchPanel: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
  },
  matchLabel: {
    color: "#4D7C5C",
    fontSize: 8,
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: 0.55,
  },
  matchValue: {
    marginTop: 2,
    color: "#166534",
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
  },
  kitchenLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  ratingBadge: {
    height: 23,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 7,
    borderRadius: 7,
    backgroundColor: "#16803C",
  },
  ratingBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONT_SEMIBOLD,
  },
  kitchenName: {
    flexShrink: 1,
    color: "#51443C",
    fontSize: 13,
    fontFamily: FONT_SEMIBOLD,
  },
  distanceText: {
    marginLeft: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  priceDetailRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    marginTop: 7,
  },
  priceValue: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONT_SEMIBOLD,
  },
  priceContext: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#F0E8E2",
  },
  cardActionText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  cardActionIcon: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FFF0E3",
  },
  itemAvailability: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
  },
  itemAvailabilityMuted: {
    backgroundColor: "#F6F3F1",
  },
  itemAvailabilityText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    lineHeight: 17,
  },
  itemAvailabilityTextMuted: {
    color: COLORS.textSecondary,
  },
  frequencyText: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  kitchenRatingBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  reviewCount: {
    marginLeft: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  locationText: {
    flexShrink: 1,
    marginLeft: 3,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
  },
  matchReasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },
  matchReasonText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    lineHeight: 18,
  },
  tagSection: {
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D8D8DC",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  greenTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#86C998",
    borderRadius: 10,
    backgroundColor: "#F8FFF9",
  },
  greenTagText: {
    color: "#18733A",
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
  },
  discoveryContent: {
    paddingTop: 10,
    paddingBottom: 110,
  },
  discoverySection: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  discoverySectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: -0.25,
  },
  discoverySectionSubtitle: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  clearRecentText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontFamily: FONT_SEMIBOLD,
  },
  recentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentCard: {
    width: "48.7%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 15,
    backgroundColor: COLORS.white,
  },
  recentTapArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    minHeight: 46,
  },
  recentIconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FFF3E9",
  },
  recentText: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  removeRecentButton: {
    width: 29,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
    paddingTop: 12,
  },
  suggestionCard: {
    width: "48.3%",
    borderWidth: 1,
    borderColor: "#E8E8EA",
    borderRadius: 18,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  suggestionImage: {
    width: "100%",
    height: 112,
    backgroundColor: "#F4F4F5",
  },
  suggestionCardFooter: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  suggestionText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  suggestionArrow: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    borderRadius: 9,
    backgroundColor: "#FFF3E9",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 70,
  },
  stateIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
  },
  errorStateIcon: {
    backgroundColor: "#FEE2E2",
  },
  vegStateIcon: {
    backgroundColor: "#DCFCE7",
  },
  centerStateTitle: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONT_SEMIBOLD,
    textAlign: "center",
  },
  centerStateSubtitle: {
    marginTop: 7,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 19,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  listFooter: {
    minHeight: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreError: {
    color: COLORS.error,
    fontSize: 10,
    fontFamily: FONT_SEMIBOLD,
    textAlign: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(27, 20, 16, 0.52)",
  },
  filterSheet: {
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 9,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: COLORS.white,
  },
  sheetHandle: {
    width: 43,
    height: 4,
    alignSelf: "center",
    borderRadius: 2,
    backgroundColor: "#D8CEC7",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 13,
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontFamily: FONT_SEMIBOLD,
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#F5F1EE",
  },
  filterSectionTitle: {
    marginTop: 14,
    marginBottom: 9,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONT_SEMIBOLD,
  },
  optionStack: {
    gap: 7,
  },
  sortOption: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#E9E1DB",
    borderRadius: 15,
    backgroundColor: "#FFFCFA",
  },
  sortOptionSelected: {
    borderColor: "#F3A36A",
    backgroundColor: "#FFF3E9",
  },
  sortOptionCopy: {
    flex: 1,
  },
  optionLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  optionLabelSelected: {
    color: COLORS.primaryDark,
    fontFamily: FONT_SEMIBOLD,
  },
  optionNote: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E1D8D1",
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  choiceChipSelected: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFF0E3",
  },
  choiceChipText: {
    color: "#61534B",
    fontSize: 11,
    fontFamily: FONT_SEMIBOLD,
  },
  choiceChipTextSelected: {
    color: COLORS.primaryDark,
    fontFamily: FONT_SEMIBOLD,
  },
  offerSwitchRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 19,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#F0D6C5",
    borderRadius: 17,
    backgroundColor: "#FFF8F2",
  },
  offerSwitchCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  offerSwitchIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
  },
  offerSwitchTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  offerSwitchSubtitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: FONT_MEDIUM,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 17,
  },
  clearButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#DED4CD",
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  clearButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONT_SEMIBOLD,
  },
  applyButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONT_SEMIBOLD,
  },
});