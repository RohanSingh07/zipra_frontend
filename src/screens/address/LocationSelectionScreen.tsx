import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import { showAppAlert } from "../../components/ui/AppAlertHost";
import {
  checkServiceability,
  findNearbySavedAddress,
  getCurrentCoordinates,
  getSavedAddressLabel,
  requestForegroundLocationPermission,
  reverseGeocodeCoordinates,
  UserAddress,
} from "../../services/locationService";
import {
  LocationSource,
  ServiceLocation,
  useLocationStore,
} from "../../store/locationStore";
import { useAuthStore } from "../../store/authStore";

type BusyAction = "current" | `saved-${number}` | null;

type LocationCandidate = {
  source: LocationSource;
  label: string;
  formattedAddress?: string;
  latitude: number;
  longitude: number;
  city?: string;
  pincode?: string;
  savedAddressId?: number;
};

type LocationOptionProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  onPress: () => void;
  loading?: boolean;
  badge?: string;
};

function LocationOption({
  icon,
  title,
  description,
  onPress,
  loading = false,
  badge,
}: LocationOptionProps) {
  return (
    <TouchableOpacity
      style={styles.optionCard}
      activeOpacity={0.82}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.optionIcon}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        )}
      </View>

      <View style={styles.optionCopy}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge ? <Text style={styles.optionBadge}>{badge}</Text> : null}
        </View>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.placeholder} />
    </TouchableOpacity>
  );
}

export default function LocationSelectionScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const savedAddresses = useLocationStore((state) => state.savedAddresses);
  const selectedLocation = useLocationStore(
    (state) => state.selectedLocation
  );
  const setSelectedLocation = useLocationStore(
    (state) => state.setSelectedLocation
  );
  const setPermissionStatus = useLocationStore(
    (state) => state.setPermissionStatus
  );
  const setSavedAddresses = useLocationStore(
    (state) => state.setSavedAddresses
  );
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const finishSelection = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const confirmCandidate = async (candidate: LocationCandidate) => {
    if (!user) return;

    const serviceability = await checkServiceability({
      lat: candidate.latitude,
      lng: candidate.longitude,
      meal_type: "lunch",
    });

    if (!serviceability.serviceable || !serviceability.zone) {
      showAppAlert(
        "Not serviceable yet",
        serviceability.message ||
          "Zipra has not reached this area yet. Try another nearby location."
      );
      return;
    }

    const location: ServiceLocation = {
      ownerUserId: user.id,
      ...candidate,
      zoneId: serviceability.zone.id,
      zoneName: serviceability.zone.name,
    };

    setSelectedLocation(location);
    finishSelection();
  };

  const handleUseCurrentLocation = async () => {
    try {
      setBusyAction("current");

      const permission = await requestForegroundLocationPermission();
      setPermissionStatus(permission.status);

      if (permission.status !== "granted") {
        const buttons = permission.canAskAgain
          ? [{ text: "OK" }]
          : [
              { text: "Not now", style: "cancel" as const },
              {
                text: "Open settings",
                onPress: () => void Linking.openSettings(),
              },
            ];

        showAppAlert(
          "Location access is off",
          "Choose the area on the map, or enable location access in Settings.",
          buttons
        );
        return;
      }

      const coordinates = await getCurrentCoordinates();
      const nearbyAddress = findNearbySavedAddress(
        coordinates,
        savedAddresses
      );

      if (nearbyAddress) {
        await confirmCandidate(candidateFromAddress(nearbyAddress));
        return;
      }

      const readable = await reverseGeocodeCoordinates(coordinates);

      await confirmCandidate({
        source: "current",
        ...readable,
        ...coordinates,
      });
    } catch (error) {
      console.log("CURRENT LOCATION ERROR", error);
      showAppAlert(
        "Couldn’t get your location",
        "Please try again or choose the area manually on the map."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSavedAddress = async (address: UserAddress) => {
    try {
      setBusyAction(`saved-${address.id}`);
      await confirmCandidate(candidateFromAddress(address));
    } catch (error) {
      console.log("SAVED ADDRESS ERROR", error);
      showAppAlert(
        "Couldn’t check this address",
        "Please check your connection and try again."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSearch = () => {
    showAppAlert(
      "Area search is next",
      "Current location, nearby saved addresses, and map selection are ready. Search autocomplete will be connected through the secure Django endpoint next."
    );
  };

  const refreshAddresses = async () => {
    const response = await API.get("/addresses/");
    const addresses = Array.isArray(response.data)
      ? response.data
      : response.data?.results ?? [];

    setSavedAddresses(addresses);
  };
  const refreshControl = usePullToRefresh(refreshAddresses);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        <View style={styles.topRow}>
          {navigation.canGoBack() ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandMark}>
              <Ionicons name="location" size={22} color={COLORS.white} />
            </View>
          )}

          <Text style={styles.brand}>ZIPRA</Text>
        </View>

        <Text style={styles.title}>Where should we look?</Text>
        <Text style={styles.subtitle}>
          Pick a nearby area for kitchen availability. We’ll ask for the full
          delivery address only when you place an order.
        </Text>

        {selectedLocation ? (
          <View style={styles.currentCard}>
            <View style={styles.currentIcon}>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
            </View>
            <View style={styles.currentCopy}>
              <Text style={styles.currentEyebrow}>CURRENTLY SELECTED</Text>
              <Text style={styles.currentTitle}>{selectedLocation.label}</Text>
              <Text style={styles.currentAddress} numberOfLines={2}>
                {selectedLocation.formattedAddress || selectedLocation.zoneName}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>CHOOSE A METHOD</Text>

        <LocationOption
          icon="navigate"
          title="Use current location"
          description="Find your area using this device"
          onPress={() => void handleUseCurrentLocation()}
          loading={busyAction === "current"}
        />

        <LocationOption
          icon="search"
          title="Search an area"
          description="Search by locality, landmark, or pincode"
          onPress={handleSearch}
          badge="NEXT"
        />

        <LocationOption
          icon="map-outline"
          title="Choose on map"
          description="Move the map and confirm a nearby point"
          onPress={() => navigation.navigate("LocationMap")}
        />

        {savedAddresses.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>

            {savedAddresses.map((address) => {
              const isSelected =
                selectedLocation?.savedAddressId === address.id;

              return (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.savedCard,
                    isSelected && styles.savedCardSelected,
                  ]}
                  activeOpacity={0.82}
                  onPress={() => void handleSavedAddress(address)}
                  disabled={busyAction === `saved-${address.id}`}
                >
                  <View style={styles.savedIcon}>
                    {busyAction === `saved-${address.id}` ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                      <Ionicons
                        name={address.is_default ? "home" : "bookmark-outline"}
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </View>

                  <View style={styles.savedCopy}>
                    <View style={styles.savedTitleRow}>
                      <Text style={styles.savedTitle} numberOfLines={1}>
                        {getSavedAddressLabel(address)}
                      </Text>
                      {address.is_default ? (
                        <Text style={styles.defaultBadge}>DEFAULT</Text>
                      ) : null}
                    </View>
                    <Text style={styles.savedAddress} numberOfLines={2}>
                      {address.address_line}, {address.city} {address.pincode}
                    </Text>
                  </View>

                  {isSelected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={COLORS.success}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={COLORS.placeholder}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function candidateFromAddress(address: UserAddress): LocationCandidate {
  return {
    source: "saved",
    label: getSavedAddressLabel(address),
    formattedAddress: `${address.address_line}, ${address.city} ${address.pincode}`,
    latitude: Number(address.lat),
    longitude: Number(address.lng),
    city: address.city,
    pincode: address.pincode,
    savedAddressId: address.id,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  topRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  brand: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  title: {
    marginTop: SPACING.xl,
    color: COLORS.textPrimary,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  currentCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  currentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  currentCopy: {
    flex: 1,
    marginLeft: 12,
  },
  currentEyebrow: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  currentTitle: {
    marginTop: 3,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  currentAddress: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionLabel: {
    marginTop: SPACING.xl,
    marginBottom: 10,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  optionCard: {
    minHeight: 82,
    marginBottom: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  optionCopy: {
    flex: 1,
    marginHorizontal: 13,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  optionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 8,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  optionDescription: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  savedCard: {
    minHeight: 88,
    marginBottom: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  savedCardSelected: {
    borderColor: COLORS.success,
  },
  savedIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  savedCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  savedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savedTitle: {
    maxWidth: "70%",
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  defaultBadge: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  savedAddress: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
