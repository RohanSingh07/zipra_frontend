import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import API from "../api/client";
import type { ServiceLocation } from "./locationStore";

export type SearchTab = "food" | "kitchens";
export type SearchSort = "relevance" | "soonest" | "rating" | "distance";
export type SearchMealType = "" | "breakfast" | "lunch" | "dinner";
export type SearchDatePreset = "any" | "today" | "tomorrow" | "week";

export type SearchFilters = {
  sort: SearchSort;
  mealType: SearchMealType;
  datePreset: SearchDatePreset;
  offersOnly: boolean;
};

export type SearchNavigation = {
  screen: "MealDetails" | "RestaurantDetails";
  meal_id?: number;
  focus_item_id?: number;
  kitchen_slug?: string;
};

export type SearchMatchedItem = {
  id: number;
  name: string;
};

export type SearchKitchenSummary = {
  id: number;
  slug: string;
  name: string;
  avg_rating?: number | string | null;
  total_reviews?: number;
  tags?: string[];
  is_pure_veg?: boolean;
  has_veg_options?: boolean;
  average_cost_for_two?: number | string | null;
};

export type SearchMeal = {
  id: number;
  title: string;
  description?: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  date: string;
  base_price: number | string;
  image?: string | null;
  images?: string[];
  kitchen_slug: string;
  kitchen_name: string;
  kitchen: SearchKitchenSummary;
  matched_items: SearchMatchedItem[];
  match_type: "meal" | "meal_item" | "meal_and_item";
  match_label: string;
  days_until: number;
  availability_label: string;
  offers: string[];
  has_offer: boolean;
  distance_km?: number | null;
  navigation: SearchNavigation;
};

export type SearchNextMeal = {
  id: number;
  title: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  base_price?: number | string | null;
};

export type SearchFoodItem = {
  id: number;
  version_group?: string | number | null;
  name: string;
  description?: string;
  quantity_value?: number | string | null;
  quantity_unit?: string | null;
  image?: string | null;
  images?: string[];
  kitchen_slug: string;
  kitchen_name: string;
  kitchen: SearchKitchenSummary;
  times_served: number;
  is_frequently_served: boolean;
  next_meal?: SearchNextMeal | null;
  availability_status: "scheduled" | "not_scheduled";
  availability_label: string;
  offers: string[];
  has_offer: boolean;
  distance_km?: number | null;
  navigation: SearchNavigation;
};

export type SearchFoodResult =
  | {
      result_type: "meal";
      meal: SearchMeal;
    }
  | {
      result_type: "food_item";
      food_item: SearchFoodItem;
    };

export type SearchKitchen = {
  id: number;
  slug: string;
  name: string;
  description?: string;
  avg_rating?: number | string | null;
  total_reviews?: number;
  image?: string | null;
  images?: string[];
  location?: string;
  tags: string[];
  is_pure_veg?: boolean;
  has_veg_options?: boolean;
  average_cost_for_two?: number | string | null;
  distance_km?: number | null;
  offers: string[];
  has_offer: boolean;
  match_type: string;
  match_reason?: string | null;
  earliest_matching_meal?: (SearchNextMeal & {
    matched_items?: SearchMatchedItem[];
  }) | null;
  frequently_served_items: {
    name: string;
    times_served: number;
  }[];
  navigation: SearchNavigation;
};

export type SearchCounts = {
  food: number;
  meals: number;
  food_items: number;
  kitchens: number;
};

export type SearchPagination = {
  type: SearchTab;
  limit: number;
  has_more: boolean;
  next_cursor?: string | null;
};

export type SearchResponse = {
  query: string;
  type: SearchTab;
  sort: SearchSort;
  upcoming_meals: SearchMeal[];
  food_items: SearchFoodItem[];
  kitchens: SearchKitchen[];
  food_results: SearchFoodResult[];
  counts: SearchCounts;
  search_intent: "food" | "kitchen";
  suggested_tab: SearchTab;
  pagination?: SearchPagination | null;
};

type SearchState = {
  query: string;
  activeTab: SearchTab;
  tabManuallySelected: boolean;
  filters: SearchFilters;
  response: SearchResponse | null;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  errorMessage: string | null;
  recentSearches: string[];
  setQuery: (query: string) => void;
  setActiveTab: (tab: SearchTab) => void;
  setFilters: (filters: SearchFilters) => void;
  resetFilters: () => void;
  clearResults: () => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  search: (
    location: ServiceLocation | null,
    options?: { refresh?: boolean }
  ) => Promise<void>;
  loadMore: (location: ServiceLocation | null) => Promise<void>;
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  sort: "relevance",
  mealType: "",
  datePreset: "any",
  offersOnly: false,
};

let latestRequestId = 0;

function toLocalDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function buildSearchParams(
  state: Pick<SearchState, "query" | "activeTab" | "filters">,
  location: ServiceLocation | null,
  cursor = ""
) {
  const today = new Date();
  const params: Record<string, string | number | boolean> = {
    q: state.query.trim(),
    type: state.activeTab,
    sort: state.filters.sort,
    offers: state.filters.offersOnly,
    limit: 20,
    preview_limit: 5,
  };

  if (state.filters.mealType) {
    params.meal_type = state.filters.mealType;
  }

  if (state.filters.datePreset === "today") {
    params.date_from = toLocalDateString(today);
    params.date_to = toLocalDateString(today);
  } else if (state.filters.datePreset === "tomorrow") {
    const tomorrow = addDays(today, 1);
    params.date_from = toLocalDateString(tomorrow);
    params.date_to = toLocalDateString(tomorrow);
  } else if (state.filters.datePreset === "week") {
    params.date_from = toLocalDateString(today);
    params.date_to = toLocalDateString(addDays(today, 6));
  }

  if (location) {
    params.lat = location.latitude;
    params.lng = location.longitude;
  }

  if (cursor) {
    params.cursor = cursor;
  }

  return params;
}

function errorMessageFor(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data as
      | { detail?: string; message?: string }
      | undefined;
    return (
      detail?.detail ??
      detail?.message ??
      "We couldn’t search right now. Please try again."
    );
  }
  return "We couldn’t search right now. Please try again.";
}

function mergeById<T extends { id: number }>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

function foodResultKey(result: SearchFoodResult): string {
  return result.result_type === "meal"
    ? `meal-${result.meal.id}`
    : `food-item-${result.food_item.id}`;
}

function mergeFoodResults(
  current: SearchFoodResult[],
  next: SearchFoodResult[]
): SearchFoodResult[] {
  const seen = new Set(current.map(foodResultKey));
  return [...current, ...next.filter((item) => !seen.has(foodResultKey(item)))];
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: "",
      activeTab: "food",
      tabManuallySelected: false,
      filters: DEFAULT_SEARCH_FILTERS,
      response: null,
      loading: false,
      refreshing: false,
      loadingMore: false,
      errorMessage: null,
      recentSearches: [],

      setQuery: (query) => {
        latestRequestId += 1;
        set({
          query,
          activeTab: "food",
          tabManuallySelected: false,
          response: null,
          loading: false,
          refreshing: false,
          loadingMore: false,
          errorMessage: null,
        });
      },

      setActiveTab: (activeTab) => {
        if (get().activeTab === activeTab) return;
        latestRequestId += 1;
        set({
          activeTab,
          tabManuallySelected: true,
          response: null,
          loading: false,
          refreshing: false,
          loadingMore: false,
          errorMessage: null,
        });
      },

      setFilters: (filters) => {
        latestRequestId += 1;
        set({
          filters,
          response: null,
          loading: false,
          refreshing: false,
          loadingMore: false,
          errorMessage: null,
        });
      },

      resetFilters: () => {
        latestRequestId += 1;
        set({
          filters: DEFAULT_SEARCH_FILTERS,
          response: null,
          loading: false,
          refreshing: false,
          loadingMore: false,
          errorMessage: null,
        });
      },

      clearResults: () => {
        latestRequestId += 1;
        set({
          response: null,
          loading: false,
          refreshing: false,
          loadingMore: false,
          errorMessage: null,
        });
      },

      addRecentSearch: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        set((state) => ({
          recentSearches: [
            trimmed,
            ...state.recentSearches.filter(
              (item) => item.toLocaleLowerCase() !== trimmed.toLocaleLowerCase()
            ),
          ].slice(0, 8),
        }));
      },

      removeRecentSearch: (value) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter(
            (item) => item !== value
          ),
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),

      search: async (location, options = {}) => {
        const state = get();
        if (!state.query.trim()) {
          state.clearResults();
          return;
        }

        const requestId = ++latestRequestId;
        const refresh = options.refresh === true;
        set({
          loading: !refresh,
          refreshing: refresh,
          loadingMore: false,
          errorMessage: null,
        });

        try {
          const response = await API.get<SearchResponse>("/search/", {
            params: buildSearchParams(state, location),
          });
          if (requestId !== latestRequestId) return;
          const suggestedTab = response.data.suggested_tab;
          if (
            !state.tabManuallySelected &&
            suggestedTab &&
            suggestedTab !== state.activeTab
          ) {
            set({
              activeTab: suggestedTab,
              response: null,
              errorMessage: null,
            });
            return;
          }
          set({ response: response.data });
        } catch (error) {
          if (requestId !== latestRequestId) return;
          set({ errorMessage: errorMessageFor(error) });
        } finally {
          if (requestId === latestRequestId) {
            set({ loading: false, refreshing: false });
          }
        }
      },

      loadMore: async (location) => {
        const state = get();
        const pagination = state.response?.pagination;
        if (
          state.loading ||
          state.refreshing ||
          state.loadingMore ||
          !pagination?.has_more ||
          !pagination.next_cursor
        ) {
          return;
        }

        const requestId = latestRequestId;
        set({ loadingMore: true });
        try {
          const response = await API.get<SearchResponse>("/search/", {
            params: buildSearchParams(
              state,
              location,
              pagination.next_cursor
            ),
          });
          if (requestId !== latestRequestId) return;

          set((current) => {
            if (!current.response) return { loadingMore: false };
            const next = response.data;
            return {
              response: {
                ...next,
                food_results:
                  state.activeTab === "food"
                    ? mergeFoodResults(
                        current.response.food_results,
                        next.food_results
                      )
                    : current.response.food_results,
                upcoming_meals:
                  state.activeTab === "food"
                    ? mergeById(
                        current.response.upcoming_meals,
                        next.upcoming_meals
                      )
                    : current.response.upcoming_meals,
                food_items:
                  state.activeTab === "food"
                    ? mergeById(
                        current.response.food_items,
                        next.food_items
                      )
                    : current.response.food_items,
                kitchens:
                  state.activeTab === "kitchens"
                    ? mergeById(current.response.kitchens, next.kitchens)
                    : current.response.kitchens,
              },
            };
          });
        } catch (error) {
          if (requestId === latestRequestId) {
            set({ errorMessage: errorMessageFor(error) });
          }
        } finally {
          if (requestId === latestRequestId) {
            set({ loadingMore: false });
          }
        }
      },
    }),
    {
      name: "zipra-search-state-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    }
  )
);