import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

interface Subscription {
  id: number;

  status: string;

  kitchen: {
    id: number;
    name: string;
    image: string | null;
  };

  address: {
    address_line: string;
    city: string;
    pincode: string;
  };

  next_delivery: {
    id: number;
    date: string;
    meal_type: string;
    meal_name: string;
    image: string | null;
  } | null;

  schedules: {
    day_of_week: string;
    meal_type: string;
    portion_size: string;
    people_count: number;
  }[];
}

export default function SubscriptionScreen({ navigation }: any) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active" || s.status === "paused",
  );

  const historySubscriptions = subscriptions.filter(
    (s) => s.status === "cancelled",
  );
  const fetchSubscriptions = async () => {
    try {
      const response = await API.get("/subscriptions/");

      setSubscriptions(response.data);
    } catch (error) {
      console.log("SUBSCRIPTIONS ERROR", error);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const refreshControl = usePullToRefresh(fetchSubscriptions);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Text style={styles.title}>Active Subscriptions 🍱</Text>
        {activeSubscriptions.map((subscription) => (
          <TouchableOpacity
            key={subscription.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("Home", {
                screen: "RestaurantDetails",
                params: {
                  restaurant: subscription.kitchen,
                },
              })
            }
          >
            {/* HEADER */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{subscription.kitchen.name}</Text>

                <Text style={styles.location}>{subscription.address.city}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,

                  subscription.status === "paused" && styles.pausedBadge,

                  subscription.status === "cancelled" && styles.cancelledBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,

                    subscription.status === "paused" && styles.pausedText,

                    subscription.status === "cancelled" && styles.cancelledText,
                  ]}
                >
                  {subscription.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* NEXT DELIVERY */}
            {subscription.next_delivery && (
              <TouchableOpacity
                style={styles.mealContainer}
                onPress={() =>
                  navigation.navigate("Home", {
                    screen: "RestaurantDetails",
                    params: {
                      restaurant: subscription.kitchen,
                    },
                  })
                }
              >
                <Image
                  source={{
                    uri:
                      subscription.next_delivery.image ||
                      "https://via.placeholder.com/100",
                  }}
                  style={styles.mealImage}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTitle}>Next Delivery</Text>

                  <Text style={styles.mealName}>
                    {subscription.next_delivery.meal_name}
                  </Text>

                  <Text style={styles.deliveryMeta}>
                    {subscription.next_delivery.meal_type}
                    {" • "}
                    {subscription.next_delivery.date}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* WEEKLY SCHEDULE */}
            <View style={styles.scheduleContainer}>
              <Text style={styles.scheduleTitle}>Weekly Schedule</Text>

              <Text style={styles.scheduleSummary}>
                Lunch • Dinner • Mon - Sun
              </Text>
            </View>

            {/* ACTIONS */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                      styles.secondaryAction,

                      subscription.status === "paused" &&
                        styles.resumeAction,
                    ]}
                onPress={async (e) => {

                  e.stopPropagation();

                  try {

                    if (
                      subscription.status === "paused"
                    ) {

                      await API.post(
                        `/subscriptions/${subscription.id}/resume/`
                      );

                    } else {

                      await API.post(
                        `/subscriptions/${subscription.id}/pause/`
                      );
                    }

                    fetchSubscriptions();

                  } catch (error) {

                    console.log(
                      "SUBSCRIPTION ACTION ERROR",
                      error
                    );
                  }
                }}
              >
                <Text style={[
                  styles.secondaryActionText,

                  subscription.status === "paused" &&
                    styles.resumeActionText,
                ]}>

                  {subscription.status === "paused"
                    ? "Resume"
                    : "Pause"}

                </Text>

              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelAction}
                onPress={async (e) => {
                  e.stopPropagation();

                  try {
                    await API.post(`/subscriptions/${subscription.id}/cancel/`);

                    fetchSubscriptions();
                  } catch (error) {
                    console.log("CANCEL ERROR", error);
                  }
                }}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryAction}
                onPress={(e) => {
                  e.stopPropagation();

                  navigation.navigate("SubscriptionDetails", {
                    subscriptionId: subscription.id,
                  });
                }}
              >
                <Text style={styles.primaryActionText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <Text style={styles.historyTitle}>Subscription History 🕒</Text>
        {historySubscriptions.map((subscription) => (
          <TouchableOpacity
            key={subscription.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("Home", {
                screen: "RestaurantDetails",
                params: {
                  restaurant: subscription.kitchen,
                },
              })
            }
          >
            {/* HEADER */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{subscription.kitchen.name}</Text>

                <Text style={styles.location}>{subscription.address.city}</Text>
              </View>

              <View style={[styles.statusBadge, styles.cancelledBadge]}>
                <Text style={[styles.statusText, styles.cancelledText]}>
                  CANCELLED
                </Text>
              </View>
            </View>

            {/* SCHEDULE */}
            <View style={styles.scheduleContainer}>
              <Text style={styles.scheduleTitle}>Previous Schedule</Text>

              <Text style={styles.scheduleSummary}>
                {subscription.schedules.length} scheduled meals
              </Text>
            </View>

            {/* ACTIONS */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={(e) => {
                  e.stopPropagation();

                  navigation.navigate("Home", {
                    screen: "RestaurantDetails",
                    params: {
                      restaurant: subscription.kitchen,
                    },
                  });
                }}
              >
                <Text style={styles.primaryActionText}>View Kitchen</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeBorder: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  location: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activeText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  mealContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  mealImage: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  mealTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  mealName: {
    fontWeight: "600",
  },
  dropdownButton: {
    marginTop: SPACING.sm,
  },
  dropdownText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  optionImage: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  optionText: {
    fontSize: 14,
  },
  activeBadge: {
    backgroundColor: "#DCFCE7",

    paddingHorizontal: 12,
    paddingVertical: 6,

    borderRadius: 999,
  },

  deliveryMeta: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  scheduleContainer: {
    marginTop: SPACING.lg,
  },

  scheduleTitle: {
    fontWeight: "700",
    marginBottom: SPACING.sm,
  },

  scheduleChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  scheduleChip: {
    backgroundColor: "#F3F4F6",

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 999,

    marginRight: 8,
    marginBottom: 8,
  },

  scheduleChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  actionsRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
  },

  secondaryAction: {
    flex: 1,

    borderWidth: 1,
    borderColor: "#D1D5DB",

    paddingVertical: 14,

    borderRadius: 14,

    alignItems: "center",

    marginRight: 8,
  },

  secondaryActionText: {
    fontWeight: "600",
  },

  primaryAction: {
    flex: 1,

    backgroundColor: COLORS.primary,

    paddingVertical: 14,

    borderRadius: 14,

    alignItems: "center",

    marginLeft: 8,
  },

  primaryActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  scheduleSummary: {
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  cancelAction: {
    flex: 1,

    backgroundColor: "#FEF2F2",

    paddingVertical: 14,

    borderRadius: 14,

    alignItems: "center",

    marginHorizontal: 6,
  },

  cancelActionText: {
    color: "#DC2626",
    fontWeight: "700",
  },
  statusBadge: {
    backgroundColor: "#DCFCE7",

    paddingHorizontal: 12,
    paddingVertical: 6,

    borderRadius: 999,
  },

  statusText: {
    color: "#16A34A",
    fontWeight: "700",
  },

  pausedBadge: {
    backgroundColor: "#FEF3C7",
  },

  pausedText: {
    color: "#D97706",
  },

  cancelledBadge: {
    backgroundColor: "#FEE2E2",
  },

  cancelledText: {
    color: "#DC2626",
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "700",

    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  resumeAction: {
    backgroundColor: "#16A34A",
    borderWidth: 0,
  },

  resumeActionText: {
    color: "#fff",
  },
});
