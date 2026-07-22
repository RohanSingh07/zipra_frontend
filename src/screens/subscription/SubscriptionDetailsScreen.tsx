import React, {
  useEffect,
  useState,
} from "react";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import API from "@/src/api/client";
import { showAppAlert } from "@/src/components/ui/AppAlertHost";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

const COLORS = {
  primary: "#FF6B35",
  background: "#F9FAFB",
  text: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  border: "#E5E7EB",
};

export default function SubscriptionDetailsScreen({
  route,
}: any) {

  const { subscriptionId } =
    route.params;

  const [subscription, setSubscription] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [selectedMeals, setSelectedMeals] =
    useState<any>({});

  const [portionSize, setPortionSize] =
    useState("medium");

  const [peopleCount, setPeopleCount] =
    useState(1);

  const fetchSubscriptionDetails =
    async () => {

      try {

        const response =
          await API.get(
            `/subscriptions/${subscriptionId}/`
          );

        setSubscription(
          response.data
        );

        const groupedSchedules: any =
          {};

        response.data.schedules.forEach(
          (schedule: any) => {

            if (
              !groupedSchedules[
                schedule.day_of_week
              ]
            ) {

              groupedSchedules[
                schedule.day_of_week
              ] = [];
            }

            groupedSchedules[
              schedule.day_of_week
            ].push(
              schedule.meal_type
            );
          }
        );

        setSelectedMeals(
          groupedSchedules
        );

        if (
          response.data.schedules.length >
          0
        ) {

          setPortionSize(
            response.data.schedules[0]
              .portion_size
          );

          setPeopleCount(
            response.data.schedules[0]
              .people_count
          );
        }

      } catch (error) {

        console.log(
          "SUBSCRIPTION DETAIL ERROR",
          error
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    fetchSubscriptionDetails();

  }, []);

  const refreshControl = usePullToRefresh(fetchSubscriptionDetails);

  const handleSaveChanges =
    async () => {

      const schedules: any[] = [];

      Object.entries(
        selectedMeals
      ).forEach(
        ([day, meals]: any) => {

          meals.forEach(
            (meal: string) => {

              schedules.push({
                day_of_week: day,
                meal_type: meal,
                portion_size:
                  portionSize,
                people_count:
                  peopleCount,
              });
            }
          );
        }
      );

      try {

        await API.patch(
          `/subscriptions/${subscriptionId}/update/`,
          {
            kitchen_id:
              subscription.kitchen.id,

            schedules,
          }
        );

        showAppAlert("Subscription updated!", "Your meal changes are saved.");

      } catch (error) {

        console.log(
          "UPDATE ERROR",
          error
        );
      }
    };

  if (loading || !subscription) {

    return null;
  }

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          refreshControl
        }
      >

        {/* HEADER */}
        <View style={styles.header}>

          <Text style={styles.title}>
            Manage Subscription
          </Text>

          <Text style={styles.subtitle}>
            {
              subscription?.kitchen
                ?.name
            }
          </Text>

        </View>

        {/* WEEKLY SCHEDULE */}
        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            Weekly Schedule
          </Text>

          {[
            "mon",
            "tue",
            "wed",
            "thu",
            "fri",
            "sat",
            "sun",
          ].map((day) => (

            <View
              key={day}
              style={styles.dayRow}
            >

              <Text style={styles.dayText}>
                {day.toUpperCase()}
              </Text>

              <View
                style={styles.mealButtons}
              >

                {[
                  "breakfast",
                  "lunch",
                  "dinner",
                ].map((meal) => {

                  const isSelected =
                    selectedMeals[
                      day
                    ]?.includes(meal);

                  return (

                    <TouchableOpacity
                      key={meal}
                      style={[
                        styles.mealButton,

                        isSelected &&
                          styles.selectedMealButton,
                      ]}
                      onPress={() => {

                        const currentMeals =
                          selectedMeals[
                            day
                          ] || [];

                        let updatedMeals;

                        if (
                          currentMeals.includes(
                            meal
                          )
                        ) {

                          updatedMeals =
                            currentMeals.filter(
                              (
                                m: string
                              ) =>
                                m !==
                                meal
                            );

                        } else {

                          updatedMeals =
                            [
                              ...currentMeals,
                              meal,
                            ];
                        }

                        setSelectedMeals({
                          ...selectedMeals,

                          [day]:
                            updatedMeals,
                        });
                      }}
                    >

                      <Text
                        style={[
                          styles.mealButtonText,

                          isSelected &&
                            styles.selectedMealButtonText,
                        ]}
                      >
                        {meal}
                      </Text>

                    </TouchableOpacity>
                  );
                })}

              </View>

            </View>
          ))}

        </View>

        {/* PORTION SIZE */}
        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            Portion Size
          </Text>

          <View
            style={styles.portionContainer}
          >

            {[
              "small",
              "medium",
              "large",
            ].map((size) => (

              <TouchableOpacity
                key={size}
                style={[
                  styles.portionButton,

                  portionSize ===
                    size &&
                    styles.selectedPortionButton,
                ]}
                onPress={() =>
                  setPortionSize(size)
                }
              >

                <Text
                  style={[
                    styles.portionButtonText,

                    portionSize ===
                      size &&
                      styles.selectedPortionButtonText,
                  ]}
                >
                  {size}
                </Text>

              </TouchableOpacity>
            ))}

          </View>

        </View>

        {/* PEOPLE COUNT */}
        <View style={styles.section}>

          <Text style={styles.sectionTitle}>
            People Count
          </Text>

          <View
            style={styles.peopleContainer}
          >

            <TouchableOpacity
              style={styles.peopleButton}
              onPress={() => {

                if (
                  peopleCount > 1
                ) {

                  setPeopleCount(
                    peopleCount - 1
                  );
                }
              }}
            >

              <Text
                style={
                  styles.peopleButtonText
                }
              >
                -
              </Text>

            </TouchableOpacity>

            <Text
              style={
                styles.peopleCountText
              }
            >
              {peopleCount}
            </Text>

            <TouchableOpacity
              style={styles.peopleButton}
              onPress={() =>
                setPeopleCount(
                  peopleCount + 1
                )
              }
            >

              <Text
                style={
                  styles.peopleButtonText
                }
              >
                +
              </Text>

            </TouchableOpacity>

          </View>

        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={
            handleSaveChanges
          }
        >

          <Text
            style={
              styles.saveButtonText
            }
          >
            Save Changes
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  header: {
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  section: {
    backgroundColor:
      COLORS.white,

    marginHorizontal: 16,
    marginBottom: 20,

    padding: 16,

    borderRadius: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",

    marginBottom: 16,
  },

  dayRow: {
    marginBottom: 18,
  },

  dayText: {
    fontWeight: "700",
    marginBottom: 10,
  },

  mealButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  mealButton: {
    borderWidth: 1,
    borderColor:
      COLORS.border,

    paddingHorizontal: 14,
    paddingVertical: 10,

    borderRadius: 999,

    marginRight: 10,
    marginBottom: 10,
  },

  selectedMealButton: {
    backgroundColor:
      COLORS.primary,

    borderColor:
      COLORS.primary,
  },

  mealButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },

  selectedMealButtonText: {
    color: "#fff",
  },

  portionContainer: {
    flexDirection: "row",
  },

  portionButton: {
    flex: 1,

    borderWidth: 1,
    borderColor:
      COLORS.border,

    paddingVertical: 14,

    borderRadius: 14,

    alignItems: "center",

    marginRight: 10,
  },

  selectedPortionButton: {
    backgroundColor:
      COLORS.primary,

    borderColor:
      COLORS.primary,
  },

  portionButtonText: {
    fontWeight: "600",
  },

  selectedPortionButtonText: {
    color: "#fff",
  },

  peopleContainer: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent:
      "center",
  },

  peopleButton: {
    width: 44,
    height: 44,

    borderRadius: 22,

    backgroundColor:
      COLORS.primary,

    alignItems: "center",
    justifyContent:
      "center",
  },

  peopleButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  peopleCountText: {
    fontSize: 22,
    fontWeight: "700",

    marginHorizontal: 24,
  },

  saveButton: {
    backgroundColor:
      COLORS.primary,

    marginHorizontal: 16,
    marginBottom: 40,

    paddingVertical: 18,

    borderRadius: 18,

    alignItems: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
