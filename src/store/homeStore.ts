import { create } from "zustand";

import API from "../api/client";
import type { ServiceLocation } from "./locationStore";

export type HomeMeal = {
  id: number | string;
  title?: string;
  name?: string;
  image?: string | null;
  images?: string[];
  meal_type?: string;
  base_price?: number | string;
  price?: number | string;
  kitchen_name?: string;
  kitchen?: {
    id?: number | string;
    name?: string;
    slug?: string;
  };
};

export type HomeKitchen = {
  id: number | string;
  name: string;
  images?: string[];
  avg_rating?: string | number;
  total_reviews?: number;
  location?: string;
  tags?: string[];
  starting_price?: number | string;
  min_price?: number | string;
  price?: number | string;
  delivery_time?: number | string;
  delivery_time_minutes?: number | string;
  eta_minutes?: number | string;
  food_type?: string;
  is_veg?: boolean;
  is_pure_veg?: boolean;
  has_veg_options?: boolean;
  has_offer?: boolean;
  discount?: number | string;
  offers?: string[];
  meals?: HomeMeal[];
};

type HomeFeedResponse =
  | HomeKitchen[]
  | {
      results?: HomeKitchen[];
      next?: string | null;
      previous?: string | null;
      recommended_meals?: HomeMeal[];
      meals?: HomeMeal[];
    };

type RecommendedMealsResponse =
  | HomeMeal[]
  | {
      results?: HomeMeal[];
    };

type HomeState = {
  kitchens: HomeKitchen[];
  recommendedMeals: HomeMeal[];
  activeZoneId: number | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  nextPageUrl: string | null;
  hasMore: boolean;
  errorMessage: string | null;
  lastFetchedAt: number | null;
  fetchHome: (
    location: ServiceLocation,
    options?: { refresh?: boolean; force?: boolean }
  ) => Promise<void>;
  loadMore: () => Promise<void>;
  clearHome: () => void;
};

const CACHE_DURATION_MS = 2 * 60 * 1000;
let latestRequestId = 0;

export const useHomeStore = create<HomeState>((set, get) => ({
  kitchens: [],
  recommendedMeals: [],
  activeZoneId: null,
  loading: false,
  refreshing: false,
  loadingMore: false,
  nextPageUrl: null,
  hasMore: false,
  errorMessage: null,
  lastFetchedAt: null,

  fetchHome: async (location, options = {}) => {
    const { refresh = false, force = false } = options;
    const state = get();
    const isSameZone = state.activeZoneId === location.zoneId;
    const cacheIsFresh =
      isSameZone &&
      state.lastFetchedAt !== null &&
      Date.now() - state.lastFetchedAt < CACHE_DURATION_MS;

    if (!refresh && !force && cacheIsFresh) return;

    const requestId = ++latestRequestId;

    set({
      activeZoneId: location.zoneId,
      kitchens: isSameZone ? state.kitchens : [],
      recommendedMeals: isSameZone ? state.recommendedMeals : [],
      loading: !refresh,
      refreshing: refresh,
      loadingMore: false,
      nextPageUrl: isSameZone ? state.nextPageUrl : null,
      hasMore: isSameZone ? state.hasMore : false,
      errorMessage: null,
    });

    try {
      const [response, recommendedResponse] = await Promise.all([
        API.get<HomeFeedResponse>("/feed/home/", {
          params: {
            zone_id: location.zoneId,
            lat: location.latitude,
            lng: location.longitude,
            page_size: 24,
          },
        }),
        API.get<RecommendedMealsResponse>("/feed/recommended-meals/", {
          params: {
            zone_id: location.zoneId,
            lat: location.latitude,
            lng: location.longitude,
            limit: 20,
          },
        }).catch(() => null),
      ]);

      if (requestId !== latestRequestId) return;

      const kitchens = Array.isArray(response.data)
        ? response.data
        : response.data.results ?? [];
      const endpointRecommendedMeals = recommendedResponse
        ? Array.isArray(recommendedResponse.data)
          ? recommendedResponse.data
          : recommendedResponse.data.results ?? []
        : [];
      const embeddedRecommendedMeals = kitchens.flatMap(
        (kitchen) => kitchen.meals ?? []
      );
      const recommendedMeals = Array.isArray(response.data)
        ? (endpointRecommendedMeals.length > 0
            ? endpointRecommendedMeals
            : embeddedRecommendedMeals
          ).slice(0, 20)
        : (
            response.data.recommended_meals ??
            response.data.meals ??
            (endpointRecommendedMeals.length > 0
              ? endpointRecommendedMeals
              : embeddedRecommendedMeals)
          ).slice(0, 20);
      const nextPageUrl = Array.isArray(response.data)
        ? null
        : response.data.next ?? null;

      set({
        kitchens,
        recommendedMeals,
        nextPageUrl,
        hasMore: Boolean(nextPageUrl),
        lastFetchedAt: Date.now(),
      });
    } catch (error) {
      if (requestId !== latestRequestId) return;

      console.log("HOME API ERROR", error);
      set({ errorMessage: "We couldn’t load kitchens near this area." });
    } finally {
      if (requestId === latestRequestId) {
        set({ loading: false, refreshing: false });
      }
    }
  },

  loadMore: async () => {
    const state = get();

    if (state.loading || state.refreshing || state.loadingMore) return;
    if (!state.hasMore || !state.nextPageUrl) return;

    const requestId = latestRequestId;
    set({ loadingMore: true });

    try {
      const response = await API.get<HomeFeedResponse>(state.nextPageUrl);

      if (requestId !== latestRequestId) return;

      const nextKitchens = Array.isArray(response.data)
        ? response.data
        : response.data.results ?? [];
      const existingIds = new Set(get().kitchens.map((kitchen) => kitchen.id));
      const uniqueKitchens = nextKitchens.filter(
        (kitchen) => !existingIds.has(kitchen.id)
      );
      const nextPageUrl = Array.isArray(response.data)
        ? null
        : response.data.next ?? null;

      set((current) => ({
        kitchens: [...current.kitchens, ...uniqueKitchens],
        nextPageUrl,
        hasMore: Boolean(nextPageUrl),
      }));
    } catch (error) {
      console.log("HOME LOAD MORE ERROR", error);
    } finally {
      if (requestId === latestRequestId) {
        set({ loadingMore: false });
      }
    }
  },

  clearHome: () => {
    latestRequestId += 1;
    set({
      kitchens: [],
      recommendedMeals: [],
      activeZoneId: null,
      loading: false,
      refreshing: false,
      loadingMore: false,
      nextPageUrl: null,
      hasMore: false,
      errorMessage: null,
      lastFetchedAt: null,
    });
  },
}));
