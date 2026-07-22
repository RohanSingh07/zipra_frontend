import { useEffect } from "react";

import {
  checkServiceability,
  distanceBetweenCoordinatesKm,
  findNearbySavedAddress,
  getForegroundLocationPermission,
  getRecentCoordinates,
  getSavedAddresses,
  getSavedAddressLabel,
  reverseGeocodeCoordinates,
} from "../services/locationService";
import { useLocationStore } from "../store/locationStore";

export function useLocationBootstrap(userId: number | undefined) {
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const bootstrapComplete = useLocationStore(
    (state) => state.bootstrapComplete
  );

  useEffect(() => {
    if (!userId) {
      useLocationStore.getState().resetRuntimeState();
      return;
    }

    if (!hasHydrated) return;

    let cancelled = false;

    const bootstrap = async () => {
      const store = useLocationStore.getState();
      store.setBootstrapState({ complete: false, loading: true });

      if (
        store.selectedLocation &&
        store.selectedLocation.ownerUserId !== userId
      ) {
        store.clearSelectedLocation();
      }

      try {
        const [addressResult, permissionResult] = await Promise.allSettled([
          getSavedAddresses(),
          getForegroundLocationPermission(),
        ]);

        if (cancelled) return;

        const addresses =
          addressResult.status === "fulfilled" ? addressResult.value : [];
        store.setSavedAddresses(addresses);

        const permissionStatus =
          permissionResult.status === "fulfilled"
            ? permissionResult.value.status
            : "undetermined";
        store.setPermissionStatus(permissionStatus);

        const selectedLocation = useLocationStore.getState().selectedLocation;
        const shouldInspectRecentLocation =
          permissionStatus === "granted" &&
          (!selectedLocation || selectedLocation.source === "current");

        if (!shouldInspectRecentLocation) return;

        const coordinates = await getRecentCoordinates();
        if (!coordinates || cancelled) return;

        const nearbyAddress = findNearbySavedAddress(coordinates, addresses);

        if (!nearbyAddress && !selectedLocation) return;

        if (
          selectedLocation?.source === "current" &&
          !nearbyAddress &&
          distanceBetweenCoordinatesKm(coordinates, {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          }) < 0.5
        ) {
          return;
        }

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

        if (
          cancelled ||
          !serviceability.serviceable ||
          !serviceability.zone
        ) {
          return;
        }

        if (nearbyAddress) {
          store.setSelectedLocation({
            ownerUserId: userId,
            source: "saved",
            label: getSavedAddressLabel(nearbyAddress),
            formattedAddress: `${nearbyAddress.address_line}, ${nearbyAddress.city}`,
            ...checkedCoordinates,
            city: nearbyAddress.city,
            pincode: nearbyAddress.pincode,
            zoneId: serviceability.zone.id,
            zoneName: serviceability.zone.name,
            savedAddressId: nearbyAddress.id,
          });
          return;
        }

        const readable = await reverseGeocodeCoordinates(coordinates);
        if (cancelled) return;

        store.setSelectedLocation({
          ownerUserId: userId,
          source: "current",
          ...readable,
          ...coordinates,
          zoneId: serviceability.zone.id,
          zoneName: serviceability.zone.name,
        });
      } finally {
        if (!cancelled) {
          useLocationStore
            .getState()
            .setBootstrapState({ complete: true, loading: false });
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, userId]);

  return { hasHydrated, bootstrapComplete };
}
