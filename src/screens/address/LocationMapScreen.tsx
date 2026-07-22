import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING } from "../../constants/theme";
import { showAppAlert } from "../../components/ui/AppAlertHost";
import {
  checkServiceability,
  Coordinates,
  findNearbySavedAddress,
  getCurrentCoordinates,
  getForegroundLocationPermission,
  getRecentCoordinates,
  getSavedAddressLabel,
  requestForegroundLocationPermission,
  reverseGeocodeCoordinates,
} from "../../services/locationService";
import { ServiceLocation, useLocationStore } from "../../store/locationStore";
import { useAuthStore } from "../../store/authStore";

const DEFAULT_COORDINATES: Coordinates = {
  latitude: 28.626123,
  longitude: 77.372456,
};

const asRegion = (coordinates: Coordinates): Region => ({
  ...coordinates,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
});

export default function LocationMapScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
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

  const initialCoordinates = selectedLocation
    ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      }
    : DEFAULT_COORDINATES;

  const [coordinates, setCoordinates] =
    useState<Coordinates>(initialCoordinates);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRecentLocation = async () => {
      const permission = await getForegroundLocationPermission();
      if (!active) return;

      setPermissionStatus(permission.status);
      setPermissionGranted(permission.status === "granted");

      if (permission.status !== "granted" || selectedLocation) return;

      const recentCoordinates = await getRecentCoordinates();
      if (!active || !recentCoordinates) return;

      setCoordinates(recentCoordinates);
      mapRef.current?.animateToRegion(asRegion(recentCoordinates), 500);
    };

    void loadRecentLocation();

    return () => {
      active = false;
    };
  }, [selectedLocation, setPermissionStatus]);

  const moveToCurrentLocation = async () => {
    try {
      setLocating(true);
      const permission = await requestForegroundLocationPermission();
      setPermissionStatus(permission.status);
      setPermissionGranted(permission.status === "granted");

      if (permission.status !== "granted") {
        showAppAlert(
          "Location access is off",
          "You can still move the map manually and confirm an area."
        );
        return;
      }

      const currentCoordinates = await getCurrentCoordinates();
      setCoordinates(currentCoordinates);
      mapRef.current?.animateToRegion(asRegion(currentCoordinates), 550);
    } catch (error) {
      console.log("MAP CURRENT LOCATION ERROR", error);
      showAppAlert(
        "Couldn’t get your location",
        "Move the map manually or try again."
      );
    } finally {
      setLocating(false);
    }
  };

  const confirmLocation = async () => {
    if (!user) return;

    try {
      setConfirming(true);

      const nearbyAddress = findNearbySavedAddress(
        coordinates,
        savedAddresses
      );
      const readable = nearbyAddress
        ? {
            label: getSavedAddressLabel(nearbyAddress),
            formattedAddress: `${nearbyAddress.address_line}, ${nearbyAddress.city} ${nearbyAddress.pincode}`,
            city: nearbyAddress.city,
            pincode: nearbyAddress.pincode,
          }
        : await reverseGeocodeCoordinates(coordinates);
      const checkedCoordinates = nearbyAddress
        ? {
            latitude: Number(nearbyAddress.lat),
            longitude: Number(nearbyAddress.lng),
          }
        : coordinates;

      const serviceability = await checkServiceability({
        lat: checkedCoordinates.latitude,
        lng: checkedCoordinates.longitude,
        meal_type: "lunch",
      });

      if (!serviceability.serviceable || !serviceability.zone) {
        showAppAlert(
          "Not serviceable yet",
          serviceability.message ||
            "Zipra has not reached this area yet. Try another nearby point."
        );
        return;
      }

      const location: ServiceLocation = {
        ownerUserId: user.id,
        source: nearbyAddress ? "saved" : "map",
        ...readable,
        ...checkedCoordinates,
        zoneId: serviceability.zone.id,
        zoneName: serviceability.zone.name,
        savedAddressId: nearbyAddress?.id,
      };

      setSelectedLocation(location);
      navigation.popToTop();
    } catch (error) {
      console.log("MAP SERVICEABILITY ERROR", error);
      showAppAlert(
        "Couldn’t check this location",
        "Please check your connection and try again."
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={asRegion(initialCoordinates)}
        showsUserLocation={permissionGranted}
        showsMyLocationButton={false}
        onRegionChangeComplete={(region) =>
          setCoordinates({
            latitude: region.latitude,
            longitude: region.longitude,
          })
        }
      />

      <View style={styles.pinWrap} pointerEvents="none">
        <View style={styles.pinBubble}>
          <Ionicons name="location" size={30} color={COLORS.white} />
        </View>
        <View style={styles.pinShadow} />
      </View>

      <View style={[styles.header, { top: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Choose your area</Text>
          <Text style={styles.headerSubtitle}>Move the map under the pin</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.locateButton, { bottom: insets.bottom + 208 }]}
        onPress={() => void moveToCurrentLocation()}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <Ionicons name="navigate" size={21} color={COLORS.primary} />
        )}
      </TouchableOpacity>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetEyebrow}>APPROXIMATE SERVICE AREA</Text>
        <Text style={styles.sheetTitle}>Confirm this location</Text>
        <View style={styles.coordinateRow}>
          <Ionicons
            name="location-outline"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.coordinateText} numberOfLines={1}>
            {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, confirming && styles.buttonDisabled]}
          onPress={() => void confirmLocation()}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm area</Text>
              <Ionicons name="arrow-forward" size={19} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
  },
  pinWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    alignItems: "center",
    transform: [{ translateX: -25 }, { translateY: -52 }],
  },
  pinBubble: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pinShadow: {
    width: 18,
    height: 6,
    marginTop: 5,
    borderRadius: 9,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  header: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  headerCopy: {
    marginLeft: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: RADIUS.md,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  locateButton: {
    position: "absolute",
    right: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -5 },
    elevation: 12,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: "center",
    marginBottom: SPACING.md,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  sheetEyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sheetTitle: {
    marginTop: 5,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  coordinateRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  coordinateText: {
    flex: 1,
    marginLeft: 7,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  confirmButton: {
    minHeight: 54,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
