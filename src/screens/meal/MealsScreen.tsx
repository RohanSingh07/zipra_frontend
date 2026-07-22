import React, { useEffect, useState } from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

export default function MealsScreen({ navigation }: any) {
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);

  const [upcomingDeliveries, setUpcomingDeliveries] = useState<any[]>([]);

  const [pastDeliveries, setPastDeliveries] = useState<any[]>([]);

  const fetchMeals = async () => {
    try {
      const response = await API.get("/meals/");

      setActiveDeliveries(response.data.active_deliveries);

      setUpcomingDeliveries(response.data.upcoming_deliveries);

      setPastDeliveries(response.data.past_deliveries);
    } catch (error) {
      console.log("MEALS ERROR", error);
    }
  };
  
  useEffect(() => {
    fetchMeals();
  }, []);

  const refreshControl = usePullToRefresh(fetchMeals);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {/* ACTIVE DELIVERIES */}
        <Text style={styles.sectionTitle}>Active Deliveries 🍱</Text>
        {activeDeliveries.map((delivery) => (
          <TouchableOpacity
            key={delivery.id}
            style={styles.activeCard}
            onPress={() =>
              navigation.navigate("DeliveryDetails", {
                deliveryId: delivery.id,
              })
            }
          >
            <Image
              source={{
                uri: delivery.image,
              }}
              style={styles.activeImage}
            />

            <View style={styles.activeOverlay}>
              <Text style={styles.activeStatus}>{delivery.status}</Text>

              <Text style={styles.activeMealName}>{delivery.meal_name}</Text>

              <Text style={styles.activeMeta}>
                {delivery.date}
                {" • "}
                {delivery.meal_type}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* UPCOMING MEALS */}
        <Text style={styles.sectionTitle}>Upcoming Meals</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {upcomingDeliveries.map((delivery) => {
            const isSkipped = delivery.status === "cancelled";

            return (
              <TouchableOpacity
                key={delivery.id}
                style={[styles.upcomingCard, isSkipped && styles.skippedCard]}
                onPress={() =>
                  navigation.navigate("DeliveryDetails", {
                    deliveryId: delivery.id,
                  })
                }
              >
                <Image
                  source={{
                    uri: delivery.image,
                  }}
                  style={[
                    styles.upcomingImage,
                    isSkipped && styles.skippedImage,
                  ]}
                />

                <View style={styles.upcomingContent}>
                  {isSkipped && (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedBadgeText}>⏭ Skipped</Text>
                    </View>
                  )}
                  <Text style={styles.upcomingMeal}>{delivery.meal_name}</Text>

                  <Text style={styles.upcomingMeta}>{delivery.meal_type}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* HISTORY */}
        <Text style={styles.sectionTitle}>Meal History</Text>

        {pastDeliveries.map((delivery) => {
          const isSkipped = delivery.status === "cancelled";
          return (
            <TouchableOpacity
              key={delivery.id}
              style={[styles.historyCard, isSkipped && styles.skippedCard]}
              onPress={() =>
                navigation.navigate("DeliveryDetails", {
                  deliveryId: delivery.id,
                })
              }
            >
              <View style={styles.historyRow}>
                <Image
                  source={{
                    uri: delivery.image,
                  }}
                  style={[
                    styles.historyImage,
                    isSkipped && styles.skippedImage,
                  ]}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.historyMeal}>{delivery.meal_name}</Text>

                  <Text style={styles.historyMeta}>{delivery.date}</Text>
                  {isSkipped && (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedBadgeText}>⏭ Skipped</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",

    marginTop: 24,
    marginBottom: 16,

    marginHorizontal: 16,
  },

  activeCard: {
    backgroundColor: "#fff",

    marginHorizontal: 16,

    padding: 20,

    borderRadius: 22,
  },

  activeStatus: {
    color: "#16A34A",
    fontWeight: "700",
  },

  mealName: {
    fontSize: 22,
    fontWeight: "700",

    marginTop: 10,
  },

  mealMeta: {
    marginTop: 6,
    color: "#6B7280",
  },

  upcomingCard: {
    width: 220,

    backgroundColor: "#fff",

    marginLeft: 16,

    padding: 18,

    borderRadius: 20,
  },

  upcomingTitle: {
    color: "#6B7280",
  },

  upcomingMeal: {
    fontSize: 20,
    fontWeight: "700",

    marginTop: 10,
  },

  upcomingMeta: {
    marginTop: 8,
    color: "#6B7280",
  },

  historyCard: {
    backgroundColor: "#fff",

    marginHorizontal: 16,
    marginBottom: 14,

    padding: 18,

    borderRadius: 18,
  },

  historyMeal: {
    fontSize: 18,
    fontWeight: "700",
  },

  historyMeta: {
    marginTop: 6,
    color: "#6B7280",
  },
  activeImage: {
    width: "100%",
    height: 240,
    borderRadius: 24,
  },

  activeOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },

  activeMealName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },

  activeMeta: {
    color: "#fff",
    marginTop: 6,
  },

  upcomingImage: {
    width: "100%",
    height: 120,
    borderRadius: 18,
  },

  upcomingContent: {
    marginTop: 14,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  historyImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 14,
  },
  skippedCard: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  skippedImage: {
    opacity: 0.4,
  },

  skippedBadge: {
    alignSelf: "flex-start",

    backgroundColor: "#E5E7EB",

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: 10,

    marginTop: 8,
  },

  skippedBadgeText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
});
