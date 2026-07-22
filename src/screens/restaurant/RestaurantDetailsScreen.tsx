import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
  FlatList,
  TextInput,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import API from "@/src/api/client";
import { showAppAlert } from "@/src/components/ui/AppAlertHost";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";
import { Ionicons } from "@expo/vector-icons";
import { useUIStore } from "@/src/store/uiStore";

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < rating ? "star" : "star-outline"}
      size={16}
      color="#FFD700"
      style={{ marginRight: 2 }}
    />
  ));
};

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

function InlineVideo({
  uri,
  style,
  allowsPictureInPicture = false,
}: {
  uri: string;
  style: any;
  allowsPictureInPicture?: boolean;
}) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <VideoView
      style={style}
      player={player}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture={allowsPictureInPicture}
    />
  );
}

function formatVideoTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const wholeSeconds = Math.floor(value);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = String(wholeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function StoryVideoPlayer({ uri }: { uri: string }) {
  const videoRef = useRef<VideoView>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.timeUpdateEventInterval = 0.5;
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const { playbackRate } = useEvent(player, "playbackRateChange", {
    playbackRate: player.playbackRate,
  });

  useEffect(() => {
    player.pause();
    player.currentTime = 0;
  }, [player, uri]);

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View style={styles.storyPlayerShell}>
      <VideoView
        ref={videoRef}
        style={styles.storyVideo}
        player={player}
        nativeControls={false}
        contentFit="contain"
        fullscreenOptions={{ enable: true, orientation: "landscape" }}
        showsTimecodes
      />

      <View style={styles.storyControls}>
        <TouchableOpacity
          accessibilityLabel={isPlaying ? "Pause kitchen video" : "Play kitchen video"}
          style={styles.storyControlButton}
          onPress={togglePlayback}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.storyDurationText}>
          {formatVideoTime(currentTime)} / {formatVideoTime(player.duration)}
        </Text>

        <TouchableOpacity
          accessibilityLabel="Video playback settings"
          style={styles.storyControlButton}
          onPress={() => setSettingsVisible(true)}
        >
          <Ionicons name="settings-outline" size={21} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Play video fullscreen"
          style={styles.storyControlButton}
          onPress={() => void videoRef.current?.enterFullscreen()}
        >
          <Ionicons name="expand-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.videoSettingsOverlay}>
          <View style={styles.videoSettingsCard}>
            <View style={styles.videoSettingsHeader}>
              <Text style={styles.videoSettingsTitle}>Playback speed</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={23} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {[0.75, 1, 1.25, 1.5].map((rate) => {
              const active = Math.abs(playbackRate - rate) < 0.01;
              return (
                <TouchableOpacity
                  key={rate}
                  style={styles.videoSpeedOption}
                  onPress={() => {
                    player.playbackRate = rate;
                    setSettingsVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.videoSpeedText,
                      active && styles.videoSpeedTextActive,
                    ]}
                  >
                    {rate === 1 ? "Normal" : `${rate}x`}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RestaurantDetailsScreen({ route, navigation }: any) {
  const restaurant = route.params?.restaurant;
  const restaurantSlug = restaurant?.slug;
  const searchImageUrl =
    route.params?.searchImage || route.params?.search_image || null;
  const isScreenFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);

  console.log("ROUTE PARAMS", route.params);
  console.log("RESTAURANT", restaurant);
  console.log("SLUG", restaurantSlug);

  const [kitchen, setKitchen] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHeroImage, setActiveHeroImage] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(
    new Date().toLocaleDateString("en-US", { weekday: "short" }),
  );
  const screenWidth = Dimensions.get("window").width;
  const heroListRef = useRef<FlatList<string>>(null);
  const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
  const [fullPlanModalVisible, setFullPlanModalVisible] = useState(false);
  const [mealSearchQuery, setMealSearchQuery] = useState("");
  const [activeStoryVideo, setActiveStoryVideo] = useState<string | null>(null);
  const [SubscribeSelectedMeals, setSubscribeSelectedMeals] = useState<any>({
    mon: ["lunch", "dinner"],
    tue: ["lunch", "dinner"],
    wed: ["lunch", "dinner"],
    thu: ["lunch", "dinner"],
    fri: ["lunch", "dinner"],
    sat: ["lunch", "dinner"],
    sun: ["lunch", "dinner"],
  });
  const [portionSize, setPortionSize] = useState("medium");

  const [peopleCount, setPeopleCount] = useState(1);

  const [subscriptionDuration, setSubscriptionDuration] = useState("1_week");

  const PORTION_OPTIONS = ["small", "medium", "large"];

  const DURATION_OPTIONS = [
    {
      label: "1 Week",
      value: "1_week",
    },
    {
      label: "1 Month",
      value: "1_month",
    },
    {
      label: "2 Months",
      value: "2_months",
    },
    {
      label: "6 Months",
      value: "6_months",
    },
  ];

  const toggleMeal = (day: string, meal: string) => {
    setSubscribeSelectedMeals((prev: any) => {
      const exists = prev[day].includes(meal);

      return {
        ...prev,

        [day]: exists
          ? prev[day].filter((m: string) => m !== meal)
          : [...prev[day], meal],
      };
    });
  };
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const getShortWeekday = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { weekday: "short" });

  const selectedMeals =
    kitchen?.weekly_plan?.filter(
      (meal: any) => getShortWeekday(meal.date) === selectedDay,
    ) ?? [];

  const selectedDayLabel = selectedMeals.length
    ? new Date(selectedMeals[0].date).toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })
    : null;

  const tourVideo = kitchen?.tour_videos?.[0];
  const galleryVideos = useMemo(
    () => (Array.isArray(kitchen?.gallery_videos) ? kitchen.gallery_videos : []),
    [kitchen],
  );
  const galleryImages = useMemo(
    () => (Array.isArray(kitchen?.images) ? kitchen.images : []),
    [kitchen],
  );
  const heroImages = useMemo(
    () =>
      uniqueImageUrls([
        searchImageUrl,
        ...(Array.isArray(kitchen?.images) ? kitchen.images : []),
      ]),
    [kitchen, searchImageUrl],
  );
  const allPlannedMeals = useMemo(() => {
    const source = Array.isArray(kitchen?.all_planned_meals)
      ? kitchen.all_planned_meals
      : Array.isArray(kitchen?.weekly_plan)
        ? kitchen.weekly_plan
        : [];

    return [...source].sort((a: any, b: any) => {
      const dateDifference = String(b.date).localeCompare(String(a.date));
      if (dateDifference !== 0) return dateDifference;
      const mealOrder: Record<string, number> = {
        breakfast: 0,
        lunch: 1,
        dinner: 2,
      };
      return (mealOrder[a.meal_type] ?? 3) - (mealOrder[b.meal_type] ?? 3);
    });
  }, [kitchen]);
  const fullPlanGroups = useMemo(() => {
    const groups = new Map<string, any[]>();

    allPlannedMeals.forEach((meal: any) => {
      const dateKey = String(meal.date);
      const existing = groups.get(dateKey) ?? [];
      existing.push(meal);
      groups.set(dateKey, existing);
    });

    return Array.from(groups.entries()).map(([date, meals]) => ({ date, meals }));
  }, [allPlannedMeals]);
  const frequentlyServedColumns = useMemo(() => {
    const items = Array.isArray(kitchen?.frequently_served)
      ? kitchen.frequently_served
      : [];
    return Array.from({ length: Math.ceil(items.length / 2) }, (_, index) =>
      items.slice(index * 2, index * 2 + 2),
    );
  }, [kitchen]);
  const normalizedMealSearch = mealSearchQuery.trim().toLowerCase();
  const matchingPlanMeals = useMemo(() => {
    if (!normalizedMealSearch) return [];
    return allPlannedMeals.filter((meal: any) => {
      const searchableText = [
        meal.title,
        meal.meal_type,
        ...(Array.isArray(meal.items)
          ? meal.items.map((item: any) => item.name)
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(normalizedMealSearch);
    });
  }, [allPlannedMeals, normalizedMealSearch]);
  const matchingFrequentItems = useMemo(() => {
    if (!normalizedMealSearch) return [];
    const scheduledItemIds = new Set(
      matchingPlanMeals.flatMap((meal: any) =>
        (meal.items ?? []).map((item: any) => String(item.id)),
      ),
    );
    return (kitchen?.frequently_served ?? []).filter(
      (item: any) =>
        String(item.name ?? "")
          .toLowerCase()
          .includes(normalizedMealSearch) && !scheduledItemIds.has(String(item.id)),
    );
  }, [kitchen, matchingPlanMeals, normalizedMealSearch]);

  const loadKitchenScreen = useCallback(async (showFullLoader = true) => {
    if (!restaurantSlug) {
      setKitchen(null);
      setError("Kitchen information is missing. Please go back and try again.");
      setLoading(false);
      return;
    }

    try {
      if (showFullLoader) setLoading(true);
      setError(null);
      if (showFullLoader) setKitchen(null);

      let defaultAddress: any = null;

      // An address helps the API calculate availability, but a missing or
      // failed address request should not leave the kitchen page loading forever.
      try {
        const addressResponse = await API.get("/addresses/");
        const addresses = Array.isArray(addressResponse.data)
          ? addressResponse.data
          : Array.isArray(addressResponse.data?.results)
            ? addressResponse.data.results
            : [];

        defaultAddress =
          addresses.find((address: any) => address.is_default) ||
          addresses[0] ||
          null;

        setSelectedAddress(defaultAddress);

        console.log("ADDRESSES", addresses);
        console.log("SELECTED ADDRESS", defaultAddress);
      } catch (addressError: any) {
        setSelectedAddress(null);

        console.log(
          "ADDRESS ERROR",
          addressError?.response?.status,
          addressError?.response?.data,
          addressError?.message,
        );
      }

      const response = await API.get(`/kitchens/${restaurantSlug}/`, {
        params: defaultAddress?.id
          ? {
              address_id: defaultAddress.id,
            }
          : undefined,
      });

      setKitchen(response.data);

      console.log(
        "KITCHEN DETAIL RESPONSE",
        JSON.stringify(response.data, null, 2),
      );
    } catch (requestError: any) {
      const responseData = requestError?.response?.data;
      const message =
        responseData?.detail ||
        responseData?.message ||
        (typeof responseData === "string" ? responseData : null) ||
        requestError?.message ||
        "Could not load this kitchen.";

      if (showFullLoader) {
        setKitchen(null);
        setError(message);
      }

      console.log(
        "KITCHEN DETAIL ERROR",
        requestError?.response?.status,
        responseData,
        requestError?.message,
      );
    } finally {
      if (showFullLoader) setLoading(false);
    }
  }, [restaurantSlug]);

  const handleCreateSubscription = async () => {
    const schedules: any[] = [];

    Object.entries(SubscribeSelectedMeals).forEach(([day, meals]: any) => {
      meals.forEach((meal: string) => {
        schedules.push({
          day_of_week: day,
          meal_type: meal,
          portion_size: portionSize,
          people_count: peopleCount,
        });
      });
    });

    if (!selectedAddress?.id) {
      showAppAlert("Address Required", "Please select a delivery address.");

      return;
    }

    if (schedules.length === 0) {
      showAppAlert("No Meals Selected", "Please select at least one meal.");

      return;
    }

    const payload = {
      kitchen_id: kitchen.id,

      address_id: selectedAddress.id,

      duration: subscriptionDuration,

      schedules,
    };

    try {
      const response = await API.post("/subscriptions/create/", payload);

      console.log("SUBSCRIPTION CREATED", response.data);

      setSubscribeModalVisible(false);
    } catch (error: any) {
      console.log("SUBSCRIPTION ERROR", error?.response?.data);
    }
  };

  // Load the address and kitchen together. This prevents users without a
  // saved address from getting stuck on an endless loading screen.
  useEffect(() => {
    void loadKitchenScreen();
  }, [loadKitchenScreen]);

  useFocusEffect(
    useCallback(() => {
      setTabBarVisible(false);
      navigation.setOptions({ headerShown: false });

      return () => setTabBarVisible(true);
    }, [navigation, setTabBarVisible]),
  );

  useEffect(() => {
    const availableStoryVideos = uniqueImageUrls([
      tourVideo,
      ...galleryVideos,
    ]);
    setActiveStoryVideo((current) =>
      current && availableStoryVideos.includes(current)
        ? current
        : availableStoryVideos[0] ?? null,
    );
  }, [galleryVideos, tourVideo]);

  useEffect(() => {
    if (kitchen?.weekly_plan?.length) {
      const availableDays = kitchen.weekly_plan.map((meal: any) =>
        getShortWeekday(meal.date),
      );

      if (!availableDays.includes(selectedDay)) {
        setSelectedDay(availableDays[0]);
      }
    }
  }, [kitchen, selectedDay]);

  useEffect(() => {
    setActiveHeroImage(0);
    requestAnimationFrame(() => {
      heroListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [heroImages.length, restaurantSlug, searchImageUrl]);

  useEffect(() => {
    if (!isScreenFocused || !heroVisible || heroImages.length < 2) return;

    const timer = setInterval(() => {
      setActiveHeroImage((current) => {
        const next = (current + 1) % heroImages.length;
        heroListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [heroImages.length, heroVisible, isScreenFocused]);

  const handleHeroScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / screenWidth,
    );
    setActiveHeroImage(
      Math.min(Math.max(nextIndex, 0), heroImages.length - 1),
    );
  };

  const refreshControl = usePullToRefresh(() => loadKitchenScreen(false));

  if (loading) {
    return (
      <SafeAreaView style={styles.centerState}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Loading kitchen...</Text>
        <Text style={styles.loadingMessage}>
          Fetching the menu, media and delivery availability.
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !kitchen) {
    return (
      <SafeAreaView style={styles.centerState}>
        <View style={styles.errorIconCircle}>
          <Ionicons
            name="restaurant-outline"
            size={34}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.errorTitle}>Kitchen could not be loaded</Text>

        <Text style={styles.errorMessage}>
          {error || "Kitchen information is unavailable."}
        </Text>

        {!selectedAddress ? (
          <Text style={styles.errorHint}>
            No delivery address could be loaded for this account. You can still
            retry the kitchen request, or add an address first if the backend
            requires one for availability checks.
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void loadKitchenScreen()}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {!selectedAddress ? (
          <TouchableOpacity
            style={styles.addressSetupButton}
            onPress={() => navigation.navigate("AddressSelection")}
          >
            <Text style={styles.addressSetupButtonText}>
              Add Delivery Address
            </Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        onScroll={(event) => {
          setHeroVisible(event.nativeEvent.contentOffset.y < 250);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
          {heroImages.length > 0 ? (
            <FlatList
              ref={heroListRef}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              data={heroImages}
              keyExtractor={(item) => item}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              onMomentumScrollEnd={handleHeroScrollEnd}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={[styles.heroImage, { width: screenWidth }]}
                  resizeMode="cover"
                />
              )}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroImageFallback]}>
              <Ionicons
                name="restaurant-outline"
                size={40}
                color={COLORS.primary}
              />
            </View>
          )}

          {heroImages.length > 1 ? (
            <>
              {heroImages.length <= 10 ? (
                <View style={styles.heroDotsContainer}>
                  {heroImages.map((image, index) => (
                    <View
                      key={image}
                      style={[
                        styles.heroDot,
                        index === activeHeroImage && styles.heroDotActive,
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.heroCounter}>
                <Text style={styles.heroCounterText}>
                  {activeHeroImage + 1} / {heroImages.length}
                </Text>
              </View>
            </>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="Go back"
            style={[styles.heroBackButton, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* BASIC INFO */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{kitchen.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />

              <Text style={styles.ratingText}>{kitchen.avg_rating}</Text>
            </View>

            <Text style={styles.reviewText}>({kitchen.total_reviews})</Text>
            {/* LOCATION */}
            <Text style={styles.locationText}>📍 {kitchen.location}</Text>
          </View>
        </View>

        {/* Kitchen tags */}
        <View style={styles.tagsContainer}>
          {kitchen.tags?.map((tag: string) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* OFFER BANNER  */}
        <View style={styles.offerBanner}>
          <Text style={styles.offerTitle}>Special Offer!</Text>
          <Text style={styles.offerText}>Get 20% off on your first order!</Text>
        </View>

        <View style={styles.mealSearchContainer}>
          <Ionicons name="search" size={21} color={COLORS.textSecondary} />
          <TextInput
            value={mealSearchQuery}
            onChangeText={setMealSearchQuery}
            placeholder={`Search meals from ${kitchen.name}`}
            placeholderTextColor={COLORS.placeholder}
            style={styles.mealSearchInput}
            returnKeyType="search"
          />
          {mealSearchQuery ? (
            <TouchableOpacity
              accessibilityLabel="Clear meal search"
              onPress={() => setMealSearchQuery("")}
            >
              <Ionicons name="close-circle" size={21} color={COLORS.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>

        {normalizedMealSearch ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MEAL SEARCH RESULTS</Text>
            {matchingPlanMeals.length === 0 &&
            matchingFrequentItems.length === 0 ? (
              <View style={styles.mealSearchEmpty}>
                <Ionicons
                  name="search-outline"
                  size={28}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.mealSearchEmptyTitle}>No matching meal found</Text>
                <Text style={styles.mealSearchEmptyText}>
                  Try a meal name, food item, or meal type.
                </Text>
              </View>
            ) : (
              <View style={styles.mealSearchResults}>
                {matchingPlanMeals.map((meal: any) => {
                  const image = meal.image || meal.items?.[0]?.image;
                  return (
                    <TouchableOpacity
                      key={`meal-search-${meal.id}`}
                      style={styles.mealSearchResultCard}
                      onPress={() =>
                        navigation.navigate("MealDetails", { mealId: meal.id })
                      }
                    >
                      {image ? (
                        <Image
                          source={{ uri: image }}
                          style={styles.mealSearchResultImage}
                        />
                      ) : (
                        <View
                          style={[
                            styles.mealSearchResultImage,
                            styles.mealSearchResultImageFallback,
                          ]}
                        >
                          <Ionicons
                            name="restaurant-outline"
                            size={24}
                            color={COLORS.primary}
                          />
                        </View>
                      )}
                      <View style={styles.mealSearchResultContent}>
                        <View style={styles.mealSearchResultTitleRow}>
                          <Text numberOfLines={1} style={styles.mealSearchResultTitle}>
                            {meal.title}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={COLORS.textSecondary}
                          />
                        </View>
                        <Text style={styles.mealSearchResultMeta}>
                          {new Date(meal.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                          {" · "}
                          {String(meal.meal_type).replace(/^./, (value) =>
                            value.toUpperCase(),
                          )}
                        </Text>
                        <Text numberOfLines={1} style={styles.mealSearchResultItems}>
                          {(meal.items ?? [])
                            .map((item: any) => item.name)
                            .join(" • ")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {matchingFrequentItems.map((item: any) => (
                  <TouchableOpacity
                    key={`frequent-search-${item.id}`}
                    style={styles.mealSearchResultCard}
                    onPress={() =>
                      navigation.navigate("MealItemDetails", { itemId: item.id })
                    }
                  >
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.mealSearchResultImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.mealSearchResultImage,
                          styles.mealSearchResultImageFallback,
                        ]}
                      >
                        <Ionicons
                          name="restaurant-outline"
                          size={24}
                          color={COLORS.primary}
                        />
                      </View>
                    )}
                    <View style={styles.mealSearchResultContent}>
                      <View style={styles.mealSearchResultTitleRow}>
                        <Text numberOfLines={1} style={styles.mealSearchResultTitle}>
                          {item.name}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={COLORS.textSecondary}
                        />
                      </View>
                      <Text style={styles.mealSearchResultMeta}>
                        Frequently served · {item.times_served} times
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
          {/* FREQUENTLY SERVED */}
          {frequentlyServedColumns.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FREQUENTLY SERVED 🔥</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.frequentRowsContent}
              >
                {frequentlyServedColumns.map((column: any[], columnIndex) => (
                  <View
                    key={`frequent-column-${columnIndex}`}
                    style={styles.frequentColumn}
                  >
                    {column.map((item: any) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.frequentItemCard}
                        onPress={() =>
                          navigation.navigate("MealItemDetails", {
                            itemId: item.id,
                          })
                        }
                      >
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.frequentItemImage}
                          />
                        ) : (
                          <View
                            style={[
                              styles.frequentItemImage,
                              styles.frequentImageFallback,
                            ]}
                          >
                            <Ionicons
                              name="restaurant-outline"
                              size={22}
                              color={COLORS.primary}
                            />
                          </View>
                        )}

                        <View style={styles.frequentItemContent}>
                          <Text numberOfLines={2} style={styles.frequentItemName}>
                            {item.name}
                          </Text>
                          <Text style={styles.frequentItemCount}>
                            Served {item.times_served} times
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        {/* THIS WEEK'S MEAL PLAN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THIS WEEK’S MEAL PLAN 🍱</Text>

          <View style={styles.weekdayTabs}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.weekdayTab,
                  selectedDay === day && styles.weekdayTabActive,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.weekdayTabText,
                    selectedDay === day && styles.weekdayTabTextActive,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedDayLabel ? (
            <Text style={styles.selectedDayLabel}>{selectedDayLabel}</Text>
          ) : (
            <Text style={styles.noMealsText}>
              No meals available for {selectedDay}
            </Text>
          )}

          {selectedMeals.map((meal: any) => (
            <View
              key={`${meal.date}-${meal.meal_type}`}
              style={styles.mealSection}
            >
              <View style={styles.mealTypeRow}>
                <Text style={styles.mealType}>
                  {meal.meal_type === "lunch"
                    ? "🌞 Lunch"
                    : meal.meal_type === "breakfast"
                      ? "☀️ Breakfast"
                      : "🌙 Dinner"}
                </Text>

                <Text style={styles.itemsCount}>
                  {meal.items?.length} items
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {meal.items?.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.mealItemCard}
                    onPress={() => {
                      navigation.navigate("MealDetails", {
                        mealId: meal.id,
                        focusItemId: item.id,
                        searchImage: item.image,
                      });
                    }}
                  >
                    <Image
                      source={{ uri: item.image }}
                      style={styles.mealItemImage}
                    />

                    <Text numberOfLines={2} style={styles.mealItemName}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}

          {/* View Full Weekly Plan Button */}
          <TouchableOpacity
            style={styles.fullPlanButton}
            onPress={() => setFullPlanModalVisible(true)}
          >
            <Text style={styles.fullPlanButtonText}>View Full Weekly Plan</Text>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>
          </>
        )}

        {/* KITCHEN GALLERY SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KITCHEN STORY 🎥</Text>

          {activeStoryVideo ? (
            <StoryVideoPlayer key={activeStoryVideo} uri={activeStoryVideo} />
          ) : (
            <View style={styles.videoFallback}>
              <Ionicons
                name="videocam-outline"
                size={34}
                color={COLORS.textSecondary}
              />
              <Text style={styles.videoFallbackText}>
                Kitchen tour video is not available.
              </Text>
            </View>
          )}

          {(galleryVideos.length > 0 || galleryImages.length > 0) && (
            <Text style={styles.gallerySectionTitle}>More kitchen media</Text>
          )}

          <View style={styles.galleryGrid}>
            {galleryVideos.map((video: string, index: number) => (
              <TouchableOpacity
                key={`gallery-video-${index}`}
                style={[
                  styles.galleryCard,
                  styles.galleryVideoPreview,
                  video === activeStoryVideo && styles.galleryVideoPreviewActive,
                ]}
                onPress={() => setActiveStoryVideo(video)}
              >
                <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                <Text style={styles.galleryVideoLabel}>
                  {index === 0 && !tourVideo ? "Kitchen story" : `Video ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
            {galleryImages.map((image: string, index: number) => (
              <View key={`gallery-image-${index}`} style={styles.galleryCard}>
                <Image source={{ uri: image }} style={styles.galleryMedia} />
              </View>
            ))}
          </View>
        </View>

        {/* What this kitchen offers */}
        {kitchen.tags && kitchen.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WHAT THIS KITCHEN OFFERS ✓</Text>
            <View style={styles.offersContainer}>
              {kitchen.tags.map((tag: string) => (
                <View key={tag} style={styles.offerItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#16A34A"
                    style={styles.offerCheckmark}
                  />
                  <Text style={styles.offerItemText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* KITCHEN DESCRIPTION */}
        {kitchen.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT THIS KITCHEN 📝</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{kitchen.description}</Text>
            </View>
          </View>
        )}

        {/* RATINGS & REVIEWS */}
        {kitchen.reviews && kitchen.reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.reviewsHeaderContainer}>
              <View>
                <Text style={styles.sectionTitle}>Customer Reviews ⭐</Text>
                <Text style={styles.reviewsHeaderText}>
                  {kitchen.avg_rating} ({kitchen.total_reviews} reviews)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => navigation.navigate("AllReviews", { kitchen })}
              >
                <Text style={styles.seeAllButtonText}>See All</Text>
              </TouchableOpacity>
            </View>

            {kitchen.reviews.slice(0, 3).map((review: any) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Rating Stars */}
                <View style={styles.reviewStarsContainer}>
                  {renderStars(review.rating)}
                </View>

                {/* Review Comment */}
                <Text style={styles.reviewComment}>{review.comment}</Text>

                {/* Review Media */}
                {review.media && review.media.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.reviewMediaContainer}
                  >
                    {review.media.map((item: any, index: number) => (
                      <View
                        key={`${review.id}-media-${index}`}
                        style={styles.reviewMediaItem}
                      >
                        {item.media_type === "image" ? (
                          <Image
                            source={{ uri: item.url }}
                            style={styles.reviewMediaImage}
                          />
                        ) : (
                          <InlineVideo
                            uri={item.url}
                            style={styles.reviewMediaImage}
                          />
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* User Info */}
                <View style={styles.reviewUserContainer}>
                  <View style={styles.reviewUserAvatar} />
                  <View style={styles.reviewUserInfo}>
                    <Text style={styles.reviewUserName}>
                      {review.user_name}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.media &&
                    review.media.length > 0 &&
                    review.media[0]?.is_verified_purchase && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#16A34A"
                        />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                </View>
              </View>
            ))}
          </View>
        )}
        {/* KITCHEN DETAILS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KITCHEN DETAILS 🏪</Text>

          <View style={styles.kitchenDetailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#16A34A" />

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Owner</Text>

                <Text style={styles.detailValue}>{kitchen.owner_name}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="restaurant-outline" size={20} color="#16A34A" />

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Meals Served</Text>

                <Text style={styles.detailValue}>
                  {kitchen.total_meals_served}+ meals
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#16A34A" />

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Address</Text>

                <Text style={styles.detailValue}>{kitchen.full_address}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#16A34A" />

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Delivery Slots</Text>

                <Text key={1} style={styles.detailValue}>
                  Breakfast: 07:00 - 09:00
                </Text>
                <Text key={2} style={styles.detailValue}>
                  Lunch: 12:00 - 14:00
                </Text>
                <Text key={3} style={styles.detailValue}>
                  Dinner: 18:00 - 22:00
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomActionBar}>
        {kitchen.is_subscribed ? (
          <View style={styles.subscribedButton}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.subscribedButtonText}>Subscribed</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => {
                
                navigation.navigate(
                  "KitchenMealSelector",
                  {
                    kitchenSlug:
                      kitchen.slug,
                  }
                );
              }}
            >
              <Text style={styles.orderButtonText}>Order Once</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => {
                setSubscribeModalVisible(true);
              }}
            >
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={fullPlanModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setFullPlanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fullPlanModal}>
            <View style={styles.fullPlanModalHeader}>
              <View style={styles.fullPlanModalHeading}>
                <Text style={styles.fullPlanModalTitle}>Full weekly plan</Text>
                <Text style={styles.fullPlanModalSubtitle}>
                  {allPlannedMeals.length} meal
                  {allPlannedMeals.length === 1 ? "" : "s"} planned by {kitchen.name}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close full meal plan"
                style={styles.modalCloseButton}
                onPress={() => setFullPlanModalVisible(false)}
              >
                <Ionicons name="close" size={23} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.fullPlanContent}
            >
              {fullPlanGroups.length ? (
                fullPlanGroups.map((group) => {
                  const todayKey = new Date().toISOString().slice(0, 10);
                  const isPast = group.date < todayKey;
                  return (
                    <View key={group.date} style={styles.fullPlanDateGroup}>
                      <View style={styles.fullPlanDateHeader}>
                        <Text style={styles.fullPlanDateText}>
                          {new Date(`${group.date}T00:00:00`).toLocaleDateString(
                            "en-IN",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </Text>
                        <View
                          style={[
                            styles.fullPlanDateBadge,
                            !isPast && styles.fullPlanDateBadgeUpcoming,
                          ]}
                        >
                          <Text
                            style={[
                              styles.fullPlanDateBadgeText,
                              !isPast && styles.fullPlanDateBadgeTextUpcoming,
                            ]}
                          >
                            {isPast ? "Past" : "Upcoming"}
                          </Text>
                        </View>
                      </View>

                      {group.meals.map((meal: any) => {
                        const image = meal.image || meal.items?.[0]?.image;
                        return (
                          <TouchableOpacity
                            key={`full-plan-${meal.id}`}
                            style={styles.fullPlanMealCard}
                            onPress={() => {
                              setFullPlanModalVisible(false);
                              navigation.navigate("MealDetails", {
                                mealId: meal.id,
                              });
                            }}
                          >
                            {image ? (
                              <Image
                                source={{ uri: image }}
                                style={styles.fullPlanMealImage}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.fullPlanMealImage,
                                  styles.mealSearchResultImageFallback,
                                ]}
                              >
                                <Ionicons
                                  name="restaurant-outline"
                                  size={25}
                                  color={COLORS.primary}
                                />
                              </View>
                            )}

                            <View style={styles.fullPlanMealContent}>
                              <View style={styles.fullPlanMealTitleRow}>
                                <Text numberOfLines={1} style={styles.fullPlanMealTitle}>
                                  {meal.title}
                                </Text>
                                <Text style={styles.fullPlanMealType}>
                                  {String(meal.meal_type).replace(/^./, (value) =>
                                    value.toUpperCase(),
                                  )}
                                </Text>
                              </View>
                              <Text numberOfLines={2} style={styles.fullPlanMealItems}>
                                {(meal.items ?? [])
                                  .map((item: any) => item.name)
                                  .join(" • ") || "Meal items will be added soon"}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={19}
                              color={COLORS.textSecondary}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })
              ) : (
                <View style={styles.fullPlanEmpty}>
                  <Ionicons
                    name="calendar-outline"
                    size={36}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.fullPlanEmptyTitle}>No meals planned yet</Text>
                  <Text style={styles.fullPlanEmptyText}>
                    This kitchen has not published a meal plan.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SUBSCRIBE MODAL */}
      <Modal visible={subscribeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.subscribeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Meal Schedule 🍱</Text>

              <TouchableOpacity onPress={() => setSubscribeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(SubscribeSelectedMeals).map(
                ([day, meals]: any) => (
                  <View key={day} style={styles.scheduleCard}>
                    <Text style={styles.scheduleDay}>{day.toUpperCase()}</Text>

                    <View style={styles.mealOptionsRow}>
                      {["breakfast", "lunch", "dinner"].map((meal) => {
                        const selected = meals.includes(meal);

                        return (
                          <TouchableOpacity
                            key={meal}
                            style={[
                              styles.mealToggle,

                              selected && styles.mealToggleActive,
                            ]}
                            onPress={() => toggleMeal(day, meal)}
                          >
                            <Text
                              style={[
                                styles.mealToggleText,

                                selected && styles.mealToggleTextActive,
                              ]}
                            >
                              {meal}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ),
              )}
              <Text style={styles.preferenceTitle}>Portion Size 🍛</Text>

              <View style={styles.preferenceOptionsRow}>
                {PORTION_OPTIONS.map((size) => {
                  const active = portionSize === size;

                  return (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.preferenceChip,

                        active && styles.preferenceChipActive,
                      ]}
                      onPress={() => setPortionSize(size)}
                    >
                      <Text
                        style={[
                          styles.preferenceChipText,

                          active && styles.preferenceChipTextActive,
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.preferenceTitle}>Number of People 👨‍👩‍👧</Text>

              <View style={styles.peopleStepperContainer}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => {
                    if (peopleCount > 1) {
                      setPeopleCount(peopleCount - 1);
                    }
                  }}
                >
                  <Text style={styles.stepperButtonText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.peopleCountText}>{peopleCount}</Text>

                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setPeopleCount(peopleCount + 1)}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              {peopleCount > 1 && (
                <View style={styles.familyOfferCard}>
                  <Text style={styles.familyOfferText}>
                    🎉 Family savings may apply
                  </Text>
                </View>
              )}

              <Text style={styles.preferenceTitle}>Delivery Address 📍</Text>

              {selectedAddress ? (
                <View style={styles.addressCard}>
                  <Text style={styles.addressTitle}>Delivery Address</Text>

                  <Text style={styles.addressText}>
                    {selectedAddress.address_line}
                  </Text>

                  <Text style={styles.addressText}>
                    {selectedAddress.city} - {selectedAddress.pincode}
                  </Text>
                </View>
              ) : (
                <View style={styles.addressCard}>
                  <Text style={styles.addressTitle}>
                    No delivery address selected
                  </Text>

                  <Text style={styles.addressText}>
                    Add an address before creating a subscription.
                  </Text>

                  <TouchableOpacity
                    style={styles.inlineAddressButton}
                    onPress={() => {
                      setSubscribeModalVisible(false);
                      navigation.navigate("AddressSelection");
                    }}
                  >
                    <Text style={styles.inlineAddressButtonText}>
                      Add Delivery Address
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.preferenceTitle}>
                Subscription Duration 📅
              </Text>

              <View style={styles.durationContainer}>
                {DURATION_OPTIONS.map((option) => {
                  const active = subscriptionDuration === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.durationCard,

                        active && styles.durationCardActive,
                      ]}
                      onPress={() => setSubscriptionDuration(option.value)}
                    >
                      <Text
                        style={[
                          styles.durationText,

                          active && styles.durationTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.subscriptionSummaryCard}>
                <Text style={styles.summaryTitle}>Subscription Summary</Text>

                <Text style={styles.summaryText}>Portion: {portionSize}</Text>

                <Text style={styles.summaryText}>People: {peopleCount}</Text>

                <Text style={styles.summaryText}>
                  Duration:{" "}
                  {
                    DURATION_OPTIONS.find(
                      (d) => d.value === subscriptionDuration,
                    )?.label
                  }
                </Text>
                <Text>
                  Portion size and people count can be adjusted later for
                  individual meals.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleCreateSubscription}
            >
              <Text style={styles.continueButtonText}>
                Continue Subscription
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#fff",
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  loadingMessage: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E5",
  },
  errorTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  errorHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 22,
    minWidth: 150,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  addressSetupButton: {
    marginTop: 10,
    minWidth: 190,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#fff",
  },
  addressSetupButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  heroImage: {
    height: 300,
    width: "100%",
  },
  heroImageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  infoContainer: {
    paddingTop: SPACING.md,
    paddingLeft: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingText: {
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 15,
  },

  reviewText: {
    marginLeft: 6,
    color: COLORS.textSecondary,
  },

  locationText: {
    marginLeft: 18,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  description: {
    marginTop: 6,
    color: COLORS.textSecondary,
  },
  descriptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textPrimary,
    fontWeight: "400",
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  weekdayTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  weekdayTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    marginHorizontal: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  weekdayTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weekdayTabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  weekdayTabTextActive: {
    color: COLORS.background,
  },
  selectedDayLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },
  noMealsText: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  offerBanner: {
    backgroundColor: "#FFF4E5",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: "#FDE9D8",
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  offerText: {
    marginTop: SPACING.sm / 2,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  mealSearchContainer: {
    minHeight: 52,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  mealSearchInput: {
    flex: 1,
    minHeight: 50,
    marginLeft: 10,
    paddingVertical: 0,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  mealSearchResults: {
    marginTop: 4,
  },
  mealSearchResultCard: {
    minHeight: 82,
    marginBottom: 10,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  mealSearchResultImage: {
    width: 66,
    height: 66,
    borderRadius: 12,
  },
  mealSearchResultImageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryBackground,
  },
  mealSearchResultContent: {
    flex: 1,
    marginLeft: 12,
  },
  mealSearchResultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealSearchResultTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  mealSearchResultMeta: {
    marginTop: 5,
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "600",
  },
  mealSearchResultItems: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  mealSearchEmpty: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.secondaryBackground,
    padding: SPACING.lg,
  },
  mealSearchEmptyTitle: {
    marginTop: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  mealSearchEmptyText: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },
  gallerySectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.textSecondary,
  },
  sectionText: {
    marginBottom: 6,
    color: COLORS.textSecondary,
  },
  video: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.md,
  },
  tourVideo: {
    width: "100%",
    height: 220,
    borderRadius: RADIUS.md,
  },
  storyPlayerShell: {
    position: "relative",
    width: "100%",
    height: 236,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#0B0B0B",
  },
  storyVideo: {
    width: "100%",
    height: "100%",
  },
  storyControls: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    minHeight: 46,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "rgba(8,8,8,0.76)",
  },
  storyControlButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  storyDurationText: {
    flex: 1,
    marginLeft: 4,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  videoSettingsOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  videoSettingsCard: {
    width: "100%",
    maxWidth: 330,
    padding: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  videoSettingsHeader: {
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  videoSettingsTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  videoSpeedOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  videoSpeedText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  videoSpeedTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  videoFallback: {
    width: "100%",
    height: 220,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
  },
  videoFallbackText: {
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  galleryCard: {
    width: "48%",
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.card,
  },
  galleryMedia: {
    width: "100%",
    height: 140,
  },
  galleryVideoPreview: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#292524",
  },
  galleryVideoPreviewActive: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  galleryVideoLabel: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.backgroundTag,
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm / 1.5,
    paddingHorizontal: SPACING.md,
    marginRight: 5,
    marginBottom: SPACING.sm,
  },
  tagText: {
    color: COLORS.success,
    fontWeight: "600",
    fontSize: 13,
  },
  dayMealContainer: {
    marginBottom: 20,
  },

  mealDay: {
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "capitalize",
  },
  heroContainer: {
    position: "relative",
  },
  heroBackButton: {
    position: "absolute",
    left: 14,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#111827",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  heroDotsContainer: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
  },

  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.62)",
    marginHorizontal: 4,
  },
  heroDotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },
  heroCounter: {
    position: "absolute",
    right: 14,
    bottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.68)",
  },
  heroCounterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  mealSection: {
    marginBottom: 28,
  },

  dayTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  mealTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  mealType: {
    fontSize: 15,
    fontWeight: "600",
  },

  itemsCount: {
    color: "#16A34A",
    fontWeight: "600",
  },

  mealItemCard: {
    width: 110,
    marginRight: 14,
  },

  mealItemImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
    marginBottom: 8,
  },

  mealItemName: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  fullPlanButton: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",

    // iOS Shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    // Android Shadow
    elevation: 4,
  },

  fullPlanButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },

  fullPlanArrow: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  offersContainer: {
    marginTop: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  offerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    width: "48%",
  },
  offerCheckmark: {
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  offerItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    flex: 1,
  },
  reviewsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  seeAllButton: {
    backgroundColor: "#16A34A",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  seeAllButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewsHeaderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontWeight: "500",
  },
  reviewStarsContainer: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    fontWeight: "400",
  },
  reviewMediaContainer: {
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  reviewMediaItem: {
    marginRight: SPACING.sm,
  },
  reviewMediaImage: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.sm,
  },
  reviewUserContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  reviewUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  verifiedText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    marginLeft: 4,
  },
  kitchenDetailsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },

  detailContent: {
    marginLeft: SPACING.md,
    flex: 1,
  },

  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: "600",
  },

  detailValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,

    flexDirection: "row",

    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,

    backgroundColor: "#fff",

    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,

    elevation: 10,
  },

  fullPlanModal: {
    height: "88%",
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: COLORS.background,
  },
  fullPlanModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fullPlanModalHeading: {
    flex: 1,
    paddingRight: 12,
  },
  fullPlanModalTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: "800",
  },
  fullPlanModalSubtitle: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: COLORS.secondaryBackground,
  },
  fullPlanContent: {
    paddingTop: SPACING.md,
    paddingBottom: 36,
  },
  fullPlanDateGroup: {
    marginBottom: SPACING.lg,
  },
  fullPlanDateHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fullPlanDateText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  fullPlanDateBadge: {
    marginLeft: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.secondaryBackground,
  },
  fullPlanDateBadgeUpcoming: {
    backgroundColor: COLORS.primarySoft,
  },
  fullPlanDateBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  fullPlanDateBadgeTextUpcoming: {
    color: COLORS.primaryDark,
  },
  fullPlanMealCard: {
    minHeight: 84,
    marginBottom: 10,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  fullPlanMealImage: {
    width: 66,
    height: 66,
    borderRadius: 12,
  },
  fullPlanMealContent: {
    flex: 1,
    marginHorizontal: 11,
  },
  fullPlanMealTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fullPlanMealTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  fullPlanMealType: {
    marginLeft: 8,
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
  },
  fullPlanMealItems: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  fullPlanEmpty: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  fullPlanEmptyTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  fullPlanEmptyText: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },

  orderButton: {
    flex: 1,

    backgroundColor: "#fff",

    borderWidth: 1.5,
    borderColor: "#16A34A",

    paddingVertical: 16,

    borderRadius: 14,

    alignItems: "center",

    marginRight: 8,
  },

  orderButtonText: {
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 15,
  },

  subscribeButton: {
    flex: 1,

    backgroundColor: "#16A34A",

    paddingVertical: 16,

    borderRadius: 14,

    alignItems: "center",

    marginLeft: 8,
  },

  subscribeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  subscribeModal: {
    backgroundColor: "#fff",

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    padding: SPACING.lg,

    height: "82%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: SPACING.lg,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  scheduleCard: {
    backgroundColor: COLORS.card,

    padding: SPACING.md,

    borderRadius: RADIUS.md,

    marginBottom: SPACING.md,
  },

  scheduleDay: {
    fontSize: 15,
    fontWeight: "700",

    marginBottom: SPACING.md,
  },

  mealOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  mealToggle: {
    flex: 1,

    paddingVertical: 12,

    borderRadius: 12,

    backgroundColor: "#fff",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    marginHorizontal: 4,

    alignItems: "center",
  },

  mealToggleActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  mealToggleText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13,
  },

  mealToggleTextActive: {
    color: "#fff",
  },

  continueButton: {
    marginTop: SPACING.lg,

    backgroundColor: "#16A34A",

    paddingVertical: 18,

    borderRadius: 16,

    alignItems: "center",
  },

  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: "700",

    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },

  preferenceOptionsRow: {
    flexDirection: "row",
  },

  preferenceChip: {
    flex: 1,

    paddingVertical: 14,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    alignItems: "center",

    marginRight: 10,
  },

  preferenceChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  preferenceChipText: {
    fontWeight: "600",
    color: "#374151",
    textTransform: "capitalize",
  },

  preferenceChipTextActive: {
    color: "#fff",
  },

  peopleStepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginBottom: SPACING.md,
  },

  stepperButton: {
    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor: "#16A34A",

    alignItems: "center",
    justifyContent: "center",
  },

  stepperButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  peopleCountText: {
    fontSize: 24,
    fontWeight: "700",

    marginHorizontal: 24,
  },

  familyOfferCard: {
    backgroundColor: "#F0FDF4",

    padding: SPACING.md,

    borderRadius: RADIUS.md,

    marginBottom: SPACING.md,
  },

  familyOfferText: {
    color: "#16A34A",
    fontWeight: "600",
  },

  durationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  durationCard: {
    width: "48%",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    borderRadius: 14,

    paddingVertical: 16,

    alignItems: "center",

    marginBottom: SPACING.md,
  },

  durationCardActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  durationText: {
    fontWeight: "600",
    color: "#374151",
  },

  durationTextActive: {
    color: "#fff",
  },

  subscriptionSummaryCard: {
    backgroundColor: COLORS.card,

    borderRadius: 16,

    padding: SPACING.lg,

    marginTop: SPACING.lg,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",

    marginBottom: SPACING.md,
  },

  summaryText: {
    fontSize: 14,
    color: COLORS.textPrimary,

    marginBottom: 6,
  },
  addressCard: {
    backgroundColor: COLORS.card,

    borderRadius: 14,

    padding: SPACING.md,

    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  addressTitle: {
    fontSize: 15,
    fontWeight: "700",

    marginBottom: 4,
  },

  addressText: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  inlineAddressButton: {
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  inlineAddressButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  subscribedButton: {
    flex: 1,

    flexDirection: "row",

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "#16A34A",

    paddingVertical: 18,

    borderRadius: 16,
  },

  subscribedButtonText: {
    color: "#fff",

    fontWeight: "700",

    fontSize: 16,

    marginLeft: 8,
  },
  frequentRowsContent: {
    paddingTop: 4,
    paddingBottom: 8,
    paddingRight: SPACING.md,
  },
  frequentColumn: {
    width: 270,
    marginRight: 12,
  },
  frequentItemCard: {
    minHeight: 88,
    marginBottom: 10,
    padding: 7,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  frequentItemImage: {
    width: 74,
    height: 74,
    borderRadius: 12,
  },
  frequentImageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryBackground,
  },
  frequentItemContent: {
    flex: 1,
    marginLeft: 11,
  },
  frequentItemName: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18,
  },
  frequentItemCount: {
    marginTop: 6,
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "600",
  },
});