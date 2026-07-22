import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useState } from "react";

import API from "@/src/api/client";
import { showAppAlert } from "@/src/components/ui/AppAlertHost";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

import { COLORS, SPACING, RADIUS } from "../../constants/theme";

export default function OrderCheckoutScreen({ route, navigation }: any) {
  const { mealIds } = route.params;

  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<any>(null);

  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);

  const [portionSize, setPortionSize] = useState("medium");

  const [peopleCount, setPeopleCount] = useState(1);

  const [placingOrder, setPlacingOrder] = useState(false);

  const fetchSummary = async () => {
    try {
      const response = await API.post("/deliveries/order-summary/", {
        meal_ids: mealIds,
      });
      console.log(
  "ORDER RESPONSE",
  response.data
);
      setSummary(response.data);

      if (response.data.addresses?.length) {
        setSelectedAddress(response.data.addresses[0].id);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const refreshControl = usePullToRefresh(fetchSummary);

  const placeOrder = async () => {
    try {
      setPlacingOrder(true);

      const response = await API.post("/deliveries/order-once/", {
        meal_ids: mealIds,

        address_id: selectedAddress,

        portion_size: portionSize,

        people_count: peopleCount,
      });

      navigation.replace(
        "OrderSuccess",
        {

          totalOrders:
            response.data.created,

        }
      );

      
    } catch (error) {
      console.log(error);

      showAppAlert("Error", "Unable to place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const totalPrice = Number(summary?.total_price) * peopleCount;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={refreshControl}>
        {/* Meals */}

        <Text style={styles.sectionTitle}>Selected Meals</Text>

        {summary?.meals?.map((meal: any) => (
          <View key={meal.id} style={styles.mealRow}>
            <View>
              <Text style={styles.mealTitle}>{meal.title}</Text>

              <Text>{meal.date}</Text>
            </View>

            <Text>₹{meal.price}</Text>
          </View>
        ))}

        {/* Address */}

        <Text style={styles.sectionTitle}>Delivery Address</Text>

        {summary?.addresses?.map((address: any) => (
          <TouchableOpacity
            key={address.id}
            style={[
              styles.addressCard,

              selectedAddress === address.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedAddress(address.id)}
          >
            <Text>{address.address_line}</Text>

            <Text>{address.city}</Text>
          </TouchableOpacity>
        ))}

        {/* Portion */}

        <Text style={styles.sectionTitle}>Portion Size</Text>

        <View style={styles.row}>
          {["small", "medium", "large"].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.option,

                portionSize === size && styles.selectedCard,
              ]}
              onPress={() => setPortionSize(size)}
            >
              <Text>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* People */}

        <Text style={styles.sectionTitle}>People Count</Text>

        <View style={styles.peopleRow}>
          <TouchableOpacity
            onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}
          >
            <Text style={styles.counter}>-</Text>
          </TouchableOpacity>

          <Text>{peopleCount}</Text>

          <TouchableOpacity onPress={() => setPeopleCount(peopleCount + 1)}>
            <Text style={styles.counter}>+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}

      <View style={styles.footer}>
        <Text style={styles.total}>₹{totalPrice}</Text>

        <TouchableOpacity
          disabled={placingOrder}
          style={styles.placeOrderButton}
          onPress={placeOrder}
        >
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
            }}
          >
            {placingOrder ? "Placing..." : "Place Order"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },

  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
  },

  mealTitle: {
    fontWeight: "600",
  },

  addressCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  option: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },

  peopleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: RADIUS.lg,
  },

  counter: {
    fontSize: 24,
    fontWeight: "700",
  },

  footer: {
    paddingVertical: 16,
  },

  total: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },

  placeOrderButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
});
