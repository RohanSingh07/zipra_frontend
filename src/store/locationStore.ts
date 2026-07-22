import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { UserAddress } from "../services/locationService";

export type LocationSource = "current" | "saved" | "search" | "map";

export type ServiceLocation = {
  ownerUserId: number;
  source: LocationSource;
  label: string;
  formattedAddress?: string;
  latitude: number;
  longitude: number;
  city?: string;
  pincode?: string;
  zoneId: number;
  zoneName?: string;
  savedAddressId?: number;
};

export type LocationPermissionStatus =
  | "undetermined"
  | "granted"
  | "denied";

type LocationState = {
  selectedLocation: ServiceLocation | null;
  savedAddresses: UserAddress[];
  permissionStatus: LocationPermissionStatus;
  hasHydrated: boolean;
  bootstrapComplete: boolean;
  isBootstrapping: boolean;
  setSelectedLocation: (location: ServiceLocation) => void;
  clearSelectedLocation: () => void;
  setSavedAddresses: (addresses: UserAddress[]) => void;
  setPermissionStatus: (status: LocationPermissionStatus) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setBootstrapState: (state: {
    complete: boolean;
    loading: boolean;
  }) => void;
  resetRuntimeState: () => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      selectedLocation: null,
      savedAddresses: [],
      permissionStatus: "undetermined",
      hasHydrated: false,
      bootstrapComplete: false,
      isBootstrapping: false,
      setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
      clearSelectedLocation: () => set({ selectedLocation: null }),
      setSavedAddresses: (savedAddresses) => set({ savedAddresses }),
      setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setBootstrapState: ({ complete, loading }) =>
        set({ bootstrapComplete: complete, isBootstrapping: loading }),
      resetRuntimeState: () =>
        set({
          savedAddresses: [],
          permissionStatus: "undetermined",
          bootstrapComplete: false,
          isBootstrapping: false,
        }),
    }),
    {
      name: "zipra-service-location-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedLocation: state.selectedLocation,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
