import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppAlert } from "../../components/ui/AppAlertHost";
import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import {
  HomeKitchen,
  HomeMeal,
  useHomeStore,
} from "../../store/homeStore";
import { useLocationStore } from "../../store/locationStore";
import { useUIStore } from "../../store/uiStore";

type OfferBanner = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  query: string;
  image: string;
  accent: string;
};

const OFFER_BANNERS: OfferBanner[] = [
  {
    id: "homestyle",
    eyebrow: "ZIPRA DAILY",
    title: "Homestyle meals,\nwithout the daily hassle",
    subtitle: "Explore kitchens serving fresh meals near you",
    query: "homestyle",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=85",
    accent: "#F97316",
  },
  {
    id: "healthy",
    eyebrow: "EAT BETTER",
    title: "Healthy choices\nfor busy weekdays",
    subtitle: "High-protein and balanced meal options",
    query: "healthy",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=85",
    accent: "#16A34A",
  },
  {
    id: "under-99",
    eyebrow: "BUDGET BITES",
    title: "Great food\nstarting under ₹99",
    subtitle: "Affordable picks for everyday cravings",
    query: "under 99",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85",
    accent: "#EA580C",
  },
  {
    id: "biryani",
    eyebrow: "MOST LOVED",
    title: "Aromatic biryani\nfor a proper feast",
    subtitle: "Discover popular biryani kitchens nearby",
    query: "biryani",
    image:
      "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=1200&q=85",
    accent: "#B45309",
  },
  {
    id: "family",
    eyebrow: "FAMILY MEALS",
    title: "More portions,\nmore shared moments",
    subtitle: "Meal combinations suited for families",
    query: "family meals",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85",
    accent: "#DC2626",
  },
  {
    id: "subscriptions",
    eyebrow: "PLAN AHEAD",
    title: "Subscribe once.\nEat sorted all week.",
    subtitle: "Flexible meal plans from trusted kitchens",
    query: "meal subscription",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85",
    accent: "#7C3AED",
  },
];

type FoodShortcut = {
  id: string;
  label: string;
  query?: string;
  image?: string;
};

const FOOD_SHORTCUTS: FoodShortcut[] = [
  {
    id: "burger",
    label: "Burger",
    query: "burger",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "biryani",
    label: "Biryani",
    query: "biryani",
    image:
      "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "thali",
    label: "Thali",
    query: "thali",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "pizza",
    label: "Pizza",
    query: "pizza",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "salad",
    label: "Healthy",
    query: "healthy",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "dessert",
    label: "Dessert",
    query: "dessert",
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "see-all",
    label: "See all",
  },
];

type QuickFilter = {
  id: string;
  label: string;
  query: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

type SortOptionId = "relevance" | "rating" | "delivery-time";
type VegMode = "off" | "pure-kitchens" | "all-kitchens";

const SORT_OPTIONS: {
  id: SortOptionId;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    id: "relevance",
    label: "Relevance",
    description: "Best matches from the feed",
    icon: "sparkles-outline",
  },
  {
    id: "rating",
    label: "Rating",
    description: "Highest rated kitchens first",
    icon: "star-outline",
  },
  {
    id: "delivery-time",
    label: "Delivery time",
    description: "Fastest delivery first",
    icon: "time-outline",
  },
];

const QUICK_FILTERS: QuickFilter[] = [
  { id: "healthy", label: "Healthy", query: "healthy", icon: "leaf-outline" },
  {
    id: "under-99",
    label: "Under ₹99",
    query: "under 99",
    icon: "pricetag-outline",
  },
  {
    id: "offers",
    label: "Offers",
    query: "offers",
    icon: "gift-outline",
  },
  {
    id: "high-protein",
    label: "High protein",
    query: "high protein",
    icon: "fitness-outline",
  },
];

const getKitchenText = (kitchen: HomeKitchen) =>
  [
    kitchen.name,
    kitchen.location,
    kitchen.food_type,
    ...(kitchen.tags ?? []),
    ...(kitchen.offers ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const matchesFilter = (kitchen: HomeKitchen, filterId: string) => {
  const text = getKitchenText(kitchen);

  switch (filterId) {
    case "healthy":
      return /healthy|balanced|salad|low[ -]?calorie/.test(text);
    case "under-99": {
      const price =
        kitchen.starting_price ?? kitchen.min_price ?? kitchen.price ?? null;

      return price !== null
        ? Number(price) <= 99
        : /under ?₹?99|budget/.test(text);
    }
    case "offers":
      return (
        kitchen.has_offer === true ||
        Number(kitchen.discount ?? 0) > 0 ||
        (kitchen.offers?.length ?? 0) > 0 ||
        /offer|discount|% off/.test(text)
      );
    case "high-protein":
      return /high[ -]?protein|protein/.test(text);
    default:
      return true;
  }
};

const matchesVegMode = (kitchen: HomeKitchen, vegMode: VegMode) => {
  if (vegMode === "off") return true;
  const text = getKitchenText(kitchen);
  const isNonVeg = /non[ -]?veg|chicken|mutton|fish|egg|seafood/.test(text);
  const isPureVeg =
    kitchen.is_pure_veg === true ||
    (!isNonVeg && /pure[ -]?veg|vegetarian/.test(text));
  const hasVegOptions =
    kitchen.has_veg_options === true ||
    kitchen.is_veg === true ||
    isPureVeg ||
    /(^|\s)veg(\s|$)/.test(text);

  return vegMode === "pure-kitchens" ? isPureVeg : hasVegOptions;
};

const getDeliveryMinutes = (kitchen: HomeKitchen) => {
  const value =
    kitchen.delivery_time_minutes ??
    kitchen.eta_minutes ??
    kitchen.delivery_time ??
    Number.POSITIVE_INFINITY;
  const numericValue =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : Number.POSITIVE_INFINITY;
};

type KitchenCardData = HomeKitchen & {
  distance?: number | string | null;
  distance_km?: number | string | null;
  distance_in_km?: number | string | null;
  distance_meters?: number | string | null;
  offer?: string | null;
  offer_text?: string | null;
};

const formatKitchenDistance = (kitchen: KitchenCardData) => {
  const meterValue = Number(kitchen.distance_meters ?? Number.NaN);

  if (Number.isFinite(meterValue)) {
    return meterValue < 1000
      ? `${Math.round(meterValue)} m`
      : `${(meterValue / 1000).toFixed(1)} km`;
  }

  const rawDistance =
    kitchen.distance_km ?? kitchen.distance_in_km ?? kitchen.distance;

  if (rawDistance === undefined || rawDistance === null || rawDistance === "") {
    return null;
  }

  if (typeof rawDistance === "string" && /[a-z]/i.test(rawDistance)) {
    return rawDistance;
  }

  const numericDistance = Number(rawDistance);
  return Number.isFinite(numericDistance)
    ? `${numericDistance.toFixed(1)} km`
    : null;
};

function KitchenFeedCard({
  kitchen,
  width,
  isVisible,
  fallbackLocation,
  onPress,
}: {
  kitchen: HomeKitchen;
  width: number;
  isVisible: boolean;
  fallbackLocation: string;
  onPress: () => void;
}) {
  const imageListRef = useRef<FlatList<string>>(null);
  const [activeImage, setActiveImage] = useState(0);
  const images = kitchen.images ?? [];
  const primaryTag = kitchen.tags?.[0];
  const kitchenData = kitchen as KitchenCardData;
  const distanceLabel = formatKitchenDistance(kitchenData);
  const kitchenDiscount = Number(kitchen.discount ?? Number.NaN);
  const kitchenOffer =
    kitchenData.offer_text ||
    kitchenData.offer ||
    kitchen.offers?.[0] ||
    (Number.isFinite(kitchenDiscount) && kitchenDiscount > 0
      ? `${Math.round(kitchenDiscount)}% OFF`
      : null);
  const numericKitchenRating = Number(kitchen.avg_rating);
  const kitchenRatingLabel = Number.isFinite(numericKitchenRating)
    ? numericKitchenRating.toFixed(1)
    : "New";

  useEffect(() => {
    if (!isVisible || images.length < 2) return;

    const timer = setInterval(() => {
      setActiveImage((current) => {
        const next = (current + 1) % images.length;
        imageListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [images.length, isVisible]);

  return (
    <View style={[styles.kitchenFeedCard, { width }]}> 
      <View style={styles.kitchenCarouselWrap}>
        {images.length > 0 ? (
          <FlatList
            ref={imageListRef}
            data={images}
            keyExtractor={(image, index) => `${image}-${index}`}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              setActiveImage(
                Math.round(event.nativeEvent.contentOffset.x / width)
              );
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={[styles.kitchenFeedImage, { width }]}
              />
            )}
          />
        ) : (
          <View style={styles.kitchenFeedImageFallback}>
            <Ionicons
              name="restaurant-outline"
              size={38}
              color={COLORS.primary}
            />
          </View>
        )}

        {primaryTag ? (
          <View style={styles.kitchenFeedTag}>
            <Text style={styles.kitchenFeedTagText}>{primaryTag}</Text>
          </View>
        ) : null}

        {images.length > 1 ? (
          <View style={styles.kitchenImageDots}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.kitchenImageDot,
                  index === activeImage && styles.kitchenImageDotActive,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.kitchenFeedInfo}
        activeOpacity={0.76}
        onPress={onPress}
      >
        <View style={styles.kitchenFeedTitleRow}>
          <Text style={styles.kitchenFeedName} numberOfLines={1}>
            {kitchen.name}
          </Text>
          <View style={styles.kitchenFeedRatingSummary}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.kitchenFeedRating}>{kitchenRatingLabel}</Text>
            {kitchen.total_reviews ? (
              <Text style={styles.kitchenFeedReviews}>
                ({kitchen.total_reviews})
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.kitchenFeedMetaRow}>
          <Ionicons
            name="location-outline"
            size={13}
            color={COLORS.textSecondary}
          />
          <Text style={styles.kitchenFeedLocation} numberOfLines={1}>
            {kitchen.location || fallbackLocation}
          </Text>
          {distanceLabel ? (
            <>
              <View style={styles.kitchenMetaDivider} />
              <Ionicons
                name="navigate-outline"
                size={13}
                color={COLORS.textSecondary}
              />
              <Text style={styles.kitchenFeedDistance}>{distanceLabel}</Text>
            </>
          ) : null}
        </View>

        {kitchenOffer ? (
          <View style={styles.kitchenFeedOfferRow}>
            <Ionicons name="pricetag" size={13} color={COLORS.primary} />
            <Text style={styles.kitchenFeedOfferText} numberOfLines={1}>
              {kitchenOffer}
            </Text>
          </View>
        ) : null}

        {kitchen.tags?.length ? (
          <View style={styles.kitchenFeedTagsRow}>
            {kitchen.tags.slice(0, 3).map((tag, index) => (
              <View key={`${String(tag)}-${index}`} style={styles.kitchenFeedTagChip}>
                <Text style={styles.kitchenFeedTagChipText} numberOfLines={1}>
                  {String(tag)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

function RecommendedMealCard({
  meal,
  sourceKitchen,
  onPress,
}: {
  meal: HomeMeal;
  sourceKitchen?: HomeKitchen;
  onPress: () => void;
}) {
  type MealCardData = HomeMeal & {
    avg_rating?: number | string | null;
    rating?: number | string | null;
    offer?: string | null;
    offer_text?: string | null;
    offers?: string[];
    discount?: number | string | null;
    discount_percent?: number | string | null;
    original_price?: number | string | null;
    kitchen_rating?: number | string | null;
    kitchen_avg_rating?: number | string | null;
    kitchen?: NonNullable<HomeMeal["kitchen"]> & {
      avg_rating?: number | string | null;
      rating?: number | string | null;
      offer?: string | null;
      offer_text?: string | null;
      offers?: string[];
    };
  };

  const mealData = meal as MealCardData;
  const image = meal.image || meal.images?.[0];
  const title = meal.title || meal.name || "Meal";
  const kitchenName =
    meal.kitchen_name || meal.kitchen?.name || sourceKitchen?.name;
  const price = meal.base_price ?? meal.price;
  const rawRating =
    sourceKitchen?.avg_rating ??
    mealData.kitchen_avg_rating ??
    mealData.kitchen_rating ??
    mealData.kitchen?.avg_rating ??
    mealData.kitchen?.rating;
  const numericRating = Number(rawRating);
  const ratingLabel = Number.isFinite(numericRating)
    ? numericRating.toFixed(1)
    : "New";
  const discount = Number(
    mealData.discount_percent ?? mealData.discount ?? Number.NaN
  );
  const originalPrice = Number(mealData.original_price ?? Number.NaN);
  const currentPrice = Number(price ?? Number.NaN);
  const calculatedDiscount =
    Number.isFinite(originalPrice) &&
    Number.isFinite(currentPrice) &&
    originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : null;
  const offerText =
    mealData.offer_text ||
    mealData.offer ||
    mealData.offers?.[0] ||
    mealData.kitchen?.offer_text ||
    mealData.kitchen?.offer ||
    mealData.kitchen?.offers?.[0] ||
    sourceKitchen?.offers?.[0] ||
    (Number.isFinite(discount) && discount > 0
      ? `${Math.round(discount)}% OFF`
      : calculatedDiscount
        ? `${calculatedDiscount}% OFF`
        : null);

  return (
    <TouchableOpacity
      style={styles.recommendedMealCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.recommendedMealImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.recommendedMealImage} />
        ) : (
          <View style={styles.recommendedMealImageFallback}>
            <Ionicons
              name="fast-food-outline"
              size={27}
              color={COLORS.primary}
            />
          </View>
        )}

        {offerText ? (
          <View style={styles.recommendedMealOfferStrip}>
            <Ionicons name="pricetag" size={11} color="#FFFFFF" />
            <Text style={styles.recommendedMealOfferText} numberOfLines={1}>
              {offerText}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.recommendedMealBody}>
        <Text style={styles.recommendedMealName} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.recommendedMealKitchenRow}>
          <View style={styles.recommendedMealInlineRating}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.recommendedMealInlineRatingText}>
              {ratingLabel}
            </Text>
          </View>
          {kitchenName ? (
            <Text
              style={styles.recommendedMealKitchen}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {kitchenName}
            </Text>
          ) : null}
        </View>
        {price !== undefined && price !== null ? (
          <View style={styles.recommendedMealPriceRow}>
            <Text style={styles.recommendedMealPrice}>₹{price}</Text>
            {Number.isFinite(originalPrice) && originalPrice > currentPrice ? (
              <Text style={styles.recommendedMealOriginalPrice}>
                ₹{mealData.original_price}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const offerListRef = useRef<FlatList<OfferBanner>>(null);
  const stickyHeaderProgress = useRef(new Animated.Value(0)).current;
  const selectedLocation = useLocationStore(
    (state) => state.selectedLocation
  );
  const kitchens = useHomeStore((state) => state.kitchens);
  const recommendedMeals = useHomeStore((state) => state.recommendedMeals);
  const loading = useHomeStore((state) => state.loading);
  const refreshing = useHomeStore((state) => state.refreshing);
  const loadingMore = useHomeStore((state) => state.loadingMore);
  const hasMore = useHomeStore((state) => state.hasMore);
  const errorMessage = useHomeStore((state) => state.errorMessage);
  const fetchHome = useHomeStore((state) => state.fetchHome);
  const loadMore = useHomeStore((state) => state.loadMore);
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);
  const lastScrollYRef = useRef(0);
  const [visibleKitchenIds, setVisibleKitchenIds] = useState<Set<string>>(
    new Set()
  );
  const [activeOffer, setActiveOffer] = useState(0);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  const [draftFilterIds, setDraftFilterIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOptionId>("relevance");
  const [draftSortBy, setDraftSortBy] =
    useState<SortOptionId>("relevance");
  const [vegMode, setVegMode] = useState<VegMode>("off");
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const horizontalPagePadding = SPACING.md;
  const bannerWidth = width;
  const kitchenCardWidth = width - horizontalPagePadding * 2;
  const exactLocationTitle =
    selectedLocation?.formattedAddress?.split(",")[0]?.trim() ||
    selectedLocation?.label ||
    "Choose delivery location";
  const fullLocation =
    selectedLocation?.formattedAddress || selectedLocation?.zoneName || "";
  const selectedFilters = useMemo(
    () =>
      selectedFilterIds
        .map((id) => QUICK_FILTERS.find((filter) => filter.id === id))
        .filter((filter): filter is QuickFilter => Boolean(filter)),
    [selectedFilterIds]
  );
  const remainingFilters = useMemo(
    () =>
      QUICK_FILTERS.filter(
        (filter) => !selectedFilterIds.includes(filter.id)
      ),
    [selectedFilterIds]
  );
  const selectedSort = SORT_OPTIONS.find((option) => option.id === sortBy);
  const activeControlCount =
    selectedFilterIds.length + (sortBy === "relevance" ? 0 : 1);
  const recommendedMealRows = useMemo(
    () => [recommendedMeals.slice(0, 10), recommendedMeals.slice(10, 20)],
    [recommendedMeals]
  );
  const kitchensById = useMemo(
    () =>
      new Map(kitchens.map((kitchen) => [String(kitchen.id), kitchen])),
    [kitchens]
  );
  const filteredKitchens = useMemo(() => {
    const nextKitchens = kitchens.filter(
      (kitchen) =>
        matchesVegMode(kitchen, vegMode) &&
        selectedFilterIds.every((filterId) =>
          matchesFilter(kitchen, filterId)
        )
    );

    if (sortBy === "rating") {
      return [...nextKitchens].sort(
        (a, b) => Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0)
      );
    }

    if (sortBy === "delivery-time") {
      return [...nextKitchens].sort(
        (a, b) => getDeliveryMinutes(a) - getDeliveryMinutes(b)
      );
    }

    return nextKitchens;
  }, [kitchens, selectedFilterIds, sortBy, vegMode]);

  useEffect(() => {
    if (selectedLocation) {
      void fetchHome(selectedLocation);
    }
  }, [fetchHome, selectedLocation]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveOffer((current) => {
        const next = (current + 1) % OFFER_BANNERS.length;
        offerListRef.current?.scrollToIndex({
          index: next,
          animated: true,
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    Animated.timing(stickyHeaderProgress, {
      toValue: showStickyHeader ? 1 : 0,
      duration: showStickyHeader ? 300 : 220,
      useNativeDriver: true,
    }).start();
  }, [showStickyHeader, stickyHeaderProgress]);

  useFocusEffect(
    useCallback(() => {
      setTabBarVisible(true);

      return () => setTabBarVisible(true);
    }, [setTabBarVisible])
  );

  const openSearch = (initialQuery?: string) => {
    navigation.navigate("Search", initialQuery ? { initialQuery } : undefined);
  };

  const handleOfferScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / bannerWidth
    );
    setActiveOffer(Math.max(0, Math.min(nextIndex, OFFER_BANNERS.length - 1)));
  };

  const handleVoiceSearch = () => {
    showAppAlert(
      "Voice search",
      "The microphone is now part of the search experience. Native voice recognition will be connected when we move from Expo Go to the development build."
    );
  };

  const addFilter = (filterId: string) => {
    setSelectedFilterIds((current) =>
      current.includes(filterId) ? current : [...current, filterId]
    );
  };

  const removeFilter = (filterId: string) => {
    setSelectedFilterIds((current) =>
      current.filter((id) => id !== filterId)
    );
  };

  const openFilterModal = () => {
    setDraftFilterIds(selectedFilterIds);
    setDraftSortBy(sortBy);
    setFilterModalVisible(true);
  };

  const toggleDraftFilter = (filterId: string) => {
    setDraftFilterIds((current) =>
      current.includes(filterId)
        ? current.filter((id) => id !== filterId)
        : [...current, filterId]
    );
  };

  const handleHomeScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
    const scrollDelta = offsetY - lastScrollYRef.current;
    const shouldShowStickyHeader = offsetY > 300 + insets.top;

    setShowStickyHeader((current) =>
      current === shouldShowStickyHeader ? current : shouldShowStickyHeader
    );

    if (offsetY <= 8 || scrollDelta < -1) {
      setTabBarVisible(true);
    } else if (offsetY > 28 && scrollDelta > 3) {
      setTabBarVisible(false);
    }

    lastScrollYRef.current = offsetY;
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 55,
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: HomeKitchen }[] }) => {
      setVisibleKitchenIds(
        new Set(viewableItems.map(({ item }) => String(item.id)))
      );
    }
  ).current;

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

  const renderSearchAndDiet = (compact = false) => (
    <>
      <View style={[styles.searchBar, compact && styles.compactSearchBar]}>
        <TouchableOpacity
          style={[
            styles.searchTapArea,
            compact && styles.compactSearchTapArea,
          ]}
          activeOpacity={0.8}
          onPress={() => openSearch()}
        >
          <Ionicons
            name="search"
            size={compact ? 19 : 22}
            color={COLORS.textSecondary}
          />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search for food or kitchens...
          </Text>
        </TouchableOpacity>

        <View style={styles.searchDivider} />

        <TouchableOpacity
          style={[styles.voiceButton, compact && styles.compactVoiceButton]}
          onPress={handleVoiceSearch}
          accessibilityRole="button"
          accessibilityLabel="Search using your voice"
        >
          <Ionicons
            name="mic"
            size={compact ? 19 : 22}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.vegSwitchCard,
          compact && styles.compactVegSwitchCard,
          vegMode !== "off" && styles.vegSwitchCardActive,
        ]}
      >
        <View style={styles.vegSwitchCopy}>
          <View style={[styles.dietDot, styles.vegDot]} />
          <Text style={styles.vegSwitchLabel}>Veg</Text>
        </View>
        <Switch
          style={[styles.vegSwitch, compact && styles.compactVegSwitch]}
          value={vegMode !== "off"}
          onValueChange={handleVegSwitch}
          trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
          thumbColor={vegMode !== "off" ? "#15803D" : "#F9FAFB"}
        />
      </View>
    </>
  );

  const renderFoodShortcut = (item: FoodShortcut) => (
    <TouchableOpacity
      key={item.id}
      style={styles.foodShortcut}
      activeOpacity={0.78}
      onPress={() =>
        item.id === "see-all" ? openSearch() : openSearch(item.query)
      }
    >
      <View style={styles.foodImageRing}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.foodImage} />
        ) : (
          <View style={styles.seeAllFoodIcon}>
            <Ionicons name="grid-outline" size={25} color={COLORS.primary} />
          </View>
        )}
      </View>
      <Text style={styles.foodLabel} numberOfLines={1}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        style={showStickyHeader ? "dark" : "light"}
        translucent
        backgroundColor={showStickyHeader ? COLORS.white : "transparent"}
      />
      <FlatList
        data={filteredKitchens}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <KitchenFeedCard
            kitchen={item}
            width={kitchenCardWidth}
            isVisible={visibleKitchenIds.has(String(item.id))}
            fallbackLocation={
              selectedLocation?.zoneName || exactLocationTitle
            }
            onPress={() =>
              navigation.navigate("RestaurantDetails", { restaurant: item })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        onScroll={handleHomeScroll}
        scrollEventThrottle={16}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              if (selectedLocation) {
                void fetchHome(selectedLocation, {
                  refresh: true,
                  force: true,
                });
              }
            }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.offerSection}>
              <FlatList
                ref={offerListRef}
                data={OFFER_BANNERS}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleOfferScroll}
                getItemLayout={(_, index) => ({
                  length: bannerWidth,
                  offset: bannerWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => openSearch(item.query)}
                  >
                    <ImageBackground
                      source={{ uri: item.image }}
                      style={[
                        styles.offerBanner,
                        { width: bannerWidth, height: 310 + insets.top },
                      ]}
                      imageStyle={styles.offerBannerImage}
                    >
                      <View style={styles.offerOverlay} />
                      <View style={styles.offerContent}>
                        <View
                          style={[
                            styles.offerEyebrowChip,
                            { backgroundColor: item.accent },
                          ]}
                        >
                          <Text style={styles.offerEyebrow}>{item.eyebrow}</Text>
                        </View>
                        <Text style={styles.offerTitle}>{item.title}</Text>
                        <Text style={styles.offerSubtitle}>{item.subtitle}</Text>
                        <View style={styles.offerAction}>
                          <Text style={styles.offerActionText}>Explore now</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color={COLORS.textPrimary}
                          />
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                )}
              />

              <View
                style={[
                  styles.header,
                  { paddingTop: insets.top + 8 },
                ]}
              >
                <TouchableOpacity
                  style={styles.locationButton}
                  activeOpacity={0.72}
                  onPress={() => navigation.navigate("AddressSelection")}
                >
                  <View style={styles.locationIconWrap}>
                    <Ionicons name="location" size={19} color={COLORS.white} />
                  </View>

                  <View style={styles.locationCopy}>
                    <Text style={styles.locationEyebrow}>DELIVER TO</Text>
                    <View style={styles.locationTitleRow}>
                      <Text style={styles.locationTitle} numberOfLines={1}>
                        {exactLocationTitle}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={COLORS.white}
                      />
                    </View>
                    {fullLocation ? (
                      <Text style={styles.locationSubtitle} numberOfLines={1}>
                        {fullLocation}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => navigation.navigate("Profile")}
                >
                  <Ionicons
                    name="person-outline"
                    size={21}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.offerDots}>
                {OFFER_BANNERS.map((banner, index) => (
                  <View
                    key={banner.id}
                    style={[
                      styles.offerDot,
                      index === activeOffer && styles.offerDotActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.searchDock}>
                {renderSearchAndDiet()}
              </View>
            </View>

            {errorMessage ? (
              <TouchableOpacity
                style={styles.errorBanner}
                onPress={() => {
                  if (selectedLocation) {
                    void fetchHome(selectedLocation, { force: true });
                  }
                }}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={20}
                  color={COLORS.error}
                />
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>{errorMessage}</Text>
                  <Text style={styles.errorAction}>Tap to retry</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <FlatList
              horizontal
              data={FOOD_SHORTCUTS}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.foodShortcutList}
              renderItem={({ item }) => renderFoodShortcut(item)}
            />

            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterList}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    styles.filterControlChip,
                    activeControlCount > 0 && styles.filterControlChipActive,
                  ]}
                  activeOpacity={0.78}
                  onPress={openFilterModal}
                >
                  <Ionicons
                    name="options-outline"
                    size={16}
                    color={
                      activeControlCount > 0
                        ? COLORS.white
                        : COLORS.textPrimary
                    }
                  />
                  <Text
                    style={[
                      styles.filterText,
                      activeControlCount > 0 && styles.filterControlTextActive,
                    ]}
                  >
                    Filters
                  </Text>
                  {activeControlCount > 0 ? (
                    <View style={styles.filterCount}>
                      <Text style={styles.filterCountText}>
                        {activeControlCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                {sortBy !== "relevance" && selectedSort ? (
                  <TouchableOpacity
                    style={[styles.filterChip, styles.selectedSortChip]}
                    activeOpacity={0.78}
                    onPress={() => setSortBy("relevance")}
                  >
                    <Ionicons
                      name="swap-vertical-outline"
                      size={15}
                      color="#1D4ED8"
                    />
                    <Text style={styles.selectedSortText}>
                      {selectedSort.label}
                    </Text>
                    <Ionicons
                      name="close-circle"
                      size={17}
                      color="#1D4ED8"
                    />
                  </TouchableOpacity>
                ) : null}

                {selectedFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[styles.filterChip, styles.selectedFilterChip]}
                    activeOpacity={0.78}
                    onPress={() => removeFilter(filter.id)}
                  >
                    <Ionicons
                      name={filter.icon}
                      size={15}
                      color={COLORS.primaryDark}
                    />
                    <Text style={styles.selectedFilterText}>{filter.label}</Text>
                    <Ionicons
                      name="close-circle"
                      size={17}
                      color={COLORS.primaryDark}
                    />
                  </TouchableOpacity>
                ))}

                {remainingFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={styles.filterChip}
                    activeOpacity={0.78}
                    onPress={() => addFilter(filter.id)}
                  >
                    <Ionicons
                      name={filter.icon}
                      size={15}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.filterText}>{filter.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {recommendedMeals.length > 0 ? (
              <View style={styles.recommendedMealsSection}>
                <Text style={styles.sectionTitle}>Recommended meals</Text>
                <Text style={styles.sectionSubtitle}>
                  Picks available around {exactLocationTitle}
                </Text>

                {recommendedMealRows.map((mealRow, rowIndex) =>
                  mealRow.length > 0 ? (
                    <View key={rowIndex} style={styles.mealRail}>
                      <Text style={styles.mealRailTitle}>
                        {rowIndex === 0 ? "Top picks" : "More to explore"}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.mealRailContent}
                      >
                        {mealRow.map((meal) => (
                          <RecommendedMealCard
                            key={meal.id}
                            meal={meal}
                            sourceKitchen={
                              meal.kitchen?.id !== undefined
                                ? kitchensById.get(String(meal.kitchen.id))
                                : undefined
                            }
                            onPress={() =>
                              navigation.navigate("MealDetails", {
                                mealId: meal.id,
                                meal,
                              })
                            }
                          />
                        ))}
                      </ScrollView>
                    </View>
                  ) : null
                )}
              </View>
            ) : null}

            <View style={styles.recommendationHeading}>
              <View>
                <Text style={styles.sectionTitle}>Kitchens near you</Text>
                <Text style={styles.sectionSubtitle}>
                  Fresh menus serving {exactLocationTitle}
                </Text>
              </View>
              <View style={styles.recommendationCountBadge}>
                <Text style={styles.recommendationCountText}>
                  {filteredKitchens.length}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.emptyTitle}>Finding nearby kitchens...</Text>
            </View>
          ) : (selectedFilters.length > 0 || vegMode !== "off") &&
            kitchens.length > 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="options-outline"
                  size={28}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No matching kitchens</Text>
              <Text style={styles.emptyCopy}>
                Try removing one or more filters to see more options.
              </Text>
              <TouchableOpacity
                style={styles.changeAreaButton}
                onPress={() => {
                  setSelectedFilterIds([]);
                  setVegMode("off");
                  setSortBy("relevance");
                }}
              >
                <Text style={styles.changeAreaText}>Clear all filters</Text>
              </TouchableOpacity>
            </View>
          ) : !errorMessage ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={28}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No kitchens here yet</Text>
              <Text style={styles.emptyCopy}>
                Try another nearby area from the location selector.
              </Text>
              <TouchableOpacity
                style={styles.changeAreaButton}
                onPress={() => navigation.navigate("AddressSelection")}
              >
                <Text style={styles.changeAreaText}>Change area</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          refreshing || loadingMore ? (
            <View style={styles.loadMoreFooter}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadMoreText}>
                {refreshing
                  ? "Refreshing nearby kitchens..."
                  : "Loading more kitchens..."}
              </Text>
            </View>
          ) : !hasMore && kitchens.length > 0 ? (
            <Text style={styles.endOfFeedText}>
              You’ve reached the end of nearby kitchens.
            </Text>
          ) : null
        }
      />

      <Animated.View
        pointerEvents={showStickyHeader ? "auto" : "none"}
        style={[
          styles.stickyHeader,
          { paddingTop: insets.top + 7 },
          {
            opacity: stickyHeaderProgress,
            transform: [
              {
                translateY: stickyHeaderProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-190 - insets.top, 0],
                }),
              },
            ],
          },
        ]}
      >
          <View style={styles.stickySearchRow}>
            {renderSearchAndDiet(true)}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stickyFoodList}
          >
            {FOOD_SHORTCUTS.map(renderFoodShortcut)}
          </ScrollView>
      </Animated.View>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />

          <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Filter kitchens</Text>
                <Text style={styles.sheetSubtitle}>
                  Sort results and combine multiple filters
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Ionicons name="close" size={21} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetSectionTitle}>Sort by</Text>
              <View style={styles.sortOptions}>
                {SORT_OPTIONS.map((option) => {
                  const isSelected = draftSortBy === option.id;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.sortOption,
                        isSelected && styles.sortOptionSelected,
                      ]}
                      activeOpacity={0.76}
                      onPress={() => setDraftSortBy(option.id)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={
                          isSelected ? COLORS.primaryDark : COLORS.textSecondary
                        }
                      />
                      <View style={styles.sortOptionCopy}>
                        <Text style={styles.sortOptionLabel}>{option.label}</Text>
                        <Text style={styles.sortOptionDescription}>
                          {option.description}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.border}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sheetSectionTitle}>Filters</Text>
              <View style={styles.sheetOptions}>
                {QUICK_FILTERS.map((filter) => {
                  const isSelected = draftFilterIds.includes(filter.id);

                  return (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.sheetOption,
                        isSelected && styles.sheetOptionSelected,
                      ]}
                      activeOpacity={0.76}
                      onPress={() => toggleDraftFilter(filter.id)}
                    >
                      <View
                        style={[
                          styles.sheetOptionIcon,
                          isSelected && styles.sheetOptionIconSelected,
                        ]}
                      >
                        <Ionicons
                          name={filter.icon}
                          size={19}
                          color={
                            isSelected
                              ? COLORS.primaryDark
                              : COLORS.textSecondary
                          }
                        />
                      </View>
                      <Text style={styles.sheetOptionText}>{filter.label}</Text>
                      <Ionicons
                        name={
                          isSelected ? "checkmark-circle" : "ellipse-outline"
                        }
                        size={22}
                        color={isSelected ? COLORS.primary : COLORS.border}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setDraftFilterIds([]);
                  setDraftSortBy("relevance");
                }}
              >
                <Text style={styles.resetButtonText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setSelectedFilterIds(draftFilterIds);
                  setSortBy(draftSortBy);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyButtonText}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  listContent: {
    paddingBottom: 112,
  },
  header: {
    position: "absolute",
    zIndex: 3,
    top: 0,
    left: 0,
    right: 0,
    minHeight: 82,
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationButton: {
    flex: 1,
    paddingRight: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  locationIconWrap: {
    width: 25,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCopy: {
    flex: 1,
    marginLeft: 10,
  },
  locationEyebrow: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  locationTitleRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  locationTitle: {
    maxWidth: "86%",
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  locationSubtitle: {
    marginTop: 2,
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: 10,
  },
  profileButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  offerSection: {
    position: "relative",
    marginBottom: 58,
  },
  offerBanner: {
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: COLORS.textPrimary,
  },
  offerBannerImage: {},
  offerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.44)",
  },
  offerContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: 18,
    paddingBottom: 58,
  },
  offerEyebrowChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  offerEyebrow: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  offerTitle: {
    marginTop: 10,
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  offerSubtitle: {
    maxWidth: "90%",
    marginTop: 7,
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 11,
    lineHeight: 16,
  },
  offerAction: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  offerActionText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: "800",
  },
  offerDots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 38,
    flexDirection: "row",
    justifyContent: "center",
  },
  offerDot: {
    width: 5,
    height: 5,
    marginHorizontal: 3,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  offerDotActive: {
    width: 17,
    backgroundColor: COLORS.white,
  },
  searchDock: {
    position: "absolute",
    left: SPACING.md,
    right: 10,
    bottom: -37,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchBar: {
    flex: 1,
    minHeight: 74,
    paddingLeft: 17,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  compactSearchBar: {
    minHeight: 62,
    borderRadius: 19,
    shadowOpacity: 0,
    elevation: 0,
  },
  searchTapArea: {
    flex: 1,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
  },
  compactSearchTapArea: {
    minHeight: 56,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 9,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  searchDivider: {
    width: 1,
    height: 25,
    backgroundColor: COLORS.border,
  },
  voiceButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  compactVoiceButton: {
    width: 42,
    height: 42,
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
  vegSwitchLabel: {
    color: "#15803D",
    fontSize: 9,
    fontWeight: "900",
  },
  vegSwitch: {
    marginTop: -3,
    transform: [{ scaleX: 0.66 }, { scaleY: 0.66 }],
  },
  compactVegSwitchCard: {
    width: 50,
    height: 48,
    borderRadius: 14,
  },
  compactVegSwitch: {
    marginTop: -5,
    transform: [{ scaleX: 0.61 }, { scaleY: 0.61 }],
  },
  dietDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  vegDot: {
    backgroundColor: COLORS.success,
  },
  stickyHeader: {
    position: "absolute",
    zIndex: 20,
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  stickySearchRow: {
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stickyFoodList: {
    paddingTop: 11,
    paddingHorizontal: SPACING.md,
    paddingRight: SPACING.lg,
  },
  errorBanner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorCopy: {
    marginLeft: 10,
  },
  errorTitle: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "700",
  },
  errorAction: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  foodShortcutList: {
    paddingHorizontal: SPACING.md,
    paddingTop: 15,
    paddingRight: SPACING.md,
  },
  foodShortcut: {
    width: 76,
    marginRight: 10,
    alignItems: "center",
  },
  foodImageRing: {
    width: 67,
    height: 67,
    padding: 3,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  foodImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: COLORS.secondaryBackground,
  },
  seeAllFoodIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
  },
  foodLabel: {
    marginTop: 7,
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  filterSection: {
    marginTop: 21,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F1F1",
  },
  filterList: {
    paddingHorizontal: SPACING.md,
    paddingRight: SPACING.lg,
  },
  filterChip: {
    minHeight: 38,
    marginRight: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterControlChip: {
    borderColor: "#D6D6D6",
  },
  filterControlChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterControlTextActive: {
    color: COLORS.white,
  },
  filterCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: COLORS.white,
  },
  filterCountText: {
    color: COLORS.primaryDark,
    fontSize: 9,
    fontWeight: "900",
  },
  selectedFilterChip: {
    backgroundColor: COLORS.primarySoft,
    borderColor: "#FED7AA",
  },
  selectedFilterText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: "800",
  },
  selectedSortChip: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  selectedSortText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "800",
  },
  filterText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  recommendationHeading: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionSubtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  recommendationCountBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  recommendationCountText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },
  recommendedMealsSection: {
    paddingTop: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  mealRail: {
    marginTop: 16,
  },
  mealRailTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  mealRailContent: {
    paddingTop: 10,
    paddingRight: SPACING.lg,
  },
  recommendedMealCard: {
    width: 154,
    marginRight: 11,
  },
  recommendedMealImageWrap: {
    position: "relative",
    width: "100%",
    height: 105,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: COLORS.secondaryBackground,
  },
  recommendedMealImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondaryBackground,
  },
  recommendedMealImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  recommendedMealOfferStrip: {
    position: "absolute",
    left: 8,
    bottom: 8,
    maxWidth: "86%",
    minHeight: 25,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 9,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
  },
  recommendedMealOfferText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.15,
  },
  recommendedMealBody: {
    minHeight: 79,
    paddingHorizontal: 2,
    paddingTop: 9,
    paddingBottom: 4,
  },
  recommendedMealName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  recommendedMealKitchen: {
    flex: 1,
    marginLeft: 6,
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "800",
  },
  recommendedMealKitchenRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  recommendedMealInlineRating: {
    minWidth: 40,
    height: 22,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 7,
    backgroundColor: "#16803C",
  },
  recommendedMealInlineRatingText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
  },
  recommendedMealPrice: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  recommendedMealPriceRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recommendedMealOriginalPrice: {
    color: COLORS.textSecondary,
    fontSize: 9,
    textDecorationLine: "line-through",
  },
  kitchenFeedCard: {
    alignSelf: "center",
    marginHorizontal: SPACING.md,
    marginBottom: 18,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  kitchenCarouselWrap: {
    position: "relative",
    width: "100%",
    height: 218,
    backgroundColor: COLORS.secondaryBackground,
  },
  kitchenFeedImage: {
    height: 218,
    resizeMode: "cover",
  },
  kitchenFeedImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  kitchenFeedTag: {
    position: "absolute",
    left: 12,
    top: 12,
    maxWidth: "70%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  kitchenFeedTagText: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: "800",
  },
  kitchenImageDots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 11,
    flexDirection: "row",
    justifyContent: "center",
  },
  kitchenImageDot: {
    width: 5,
    height: 5,
    marginHorizontal: 3,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  kitchenImageDotActive: {
    width: 18,
    backgroundColor: COLORS.white,
  },
  kitchenFeedInfo: {
    padding: 15,
  },
  kitchenFeedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kitchenFeedName: {
    flex: 1,
    marginRight: 8,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  kitchenFeedRatingSummary: {
    minHeight: 28,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    backgroundColor: "#16803C",
  },
  kitchenFeedMetaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  kitchenFeedRating: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
  },
  kitchenFeedReviews: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 9,
    fontWeight: "700",
  },
  kitchenMetaDivider: {
    width: 1,
    height: 12,
    marginHorizontal: 8,
    backgroundColor: COLORS.border,
  },
  kitchenFeedLocation: {
    flex: 1,
    marginLeft: 3,
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
  },
  kitchenFeedDistance: {
    marginLeft: 3,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  kitchenFeedOfferRow: {
    alignSelf: "flex-start",
    marginTop: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  kitchenFeedOfferText: {
    maxWidth: "92%",
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: "900",
  },
  kitchenFeedTagsRow: {
    marginTop: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  kitchenFeedTagChip: {
    maxWidth: 128,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: "#F0FDF4",
  },
  kitchenFeedTagChipText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
  },
  loadMoreFooter: {
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    marginLeft: 9,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  endOfFeedText: {
    paddingVertical: 22,
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  emptyState: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    marginBottom: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyCopy: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  changeAreaButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
  },
  changeAreaText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.52)",
  },
  filterSheet: {
    maxHeight: "88%",
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    marginBottom: 16,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  sheetCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  sheetBody: {
    flexShrink: 1,
    marginTop: 8,
  },
  sheetSectionTitle: {
    marginTop: 14,
    marginBottom: 9,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    minHeight: 55,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: COLORS.white,
  },
  sortOptionSelected: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
  },
  sortOptionCopy: {
    flex: 1,
  },
  sortOptionLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  sortOptionDescription: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  sheetOptions: {
    gap: 9,
  },
  sheetOption: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: COLORS.white,
  },
  sheetOptionSelected: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
  },
  sheetOptionIcon: {
    width: 36,
    height: 36,
    marginRight: 11,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  sheetOptionIconSelected: {
    backgroundColor: COLORS.primarySoft,
  },
  sheetOptionText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  sheetActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },
  resetButton: {
    minWidth: 92,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  applyButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },
});