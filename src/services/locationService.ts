import * as Location from "expo-location";

import API from "@/src/api/client";

export type MealType = "breakfast" | "lunch" | "dinner";

export type CheckServiceabilityPayload = {
  lat: number;
  lng: number;
  meal_type?: MealType;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type UserAddress = {
  id: number;
  address_line: string;
  city: string;
  pincode: string;
  lat: string | number;
  lng: string | number;
  is_default: boolean;
};

export type ReadableLocation = {
  label: string;
  formattedAddress: string;
  city?: string;
  pincode?: string;
};

export type DeliveryPointOption = {
  id: number;
  name: string;
  point_type: string;
  address_line: string;
  lat: string;
  lng: string;
  instructions: string;
  distance_km: number | null;
};

export type KitchenServiceOption = {
  id: number;
  kitchen_id: number;
  kitchen_name: string;
  kitchen_slug: string;
  kitchen_description: string;
  meal_type: MealType;
  group_delivery_fee: string;
  door_delivery_fee: string;
  min_orders_for_batch: number;
  max_delivery_radius_km: string;
};

export type ServiceabilityResponse = {
  serviceable: boolean;
  message: string;
  zone: null | {
    id: number;
    name: string;
    city: string;
    area_name: string;
    center_lat: string;
    center_lng: string;
    radius_km: string;
  };
  zone_distance_km: number | null;
  delivery_points: DeliveryPointOption[];
  door_delivery: {
    available: boolean;
    fee: string | number | null;
  };
  kitchens: KitchenServiceOption[];
};

export const checkServiceability = async (
  payload: CheckServiceabilityPayload
): Promise<ServiceabilityResponse> => {
  const response = await API.post<ServiceabilityResponse>(
    "/location/check-serviceability/",
    payload
  );

  return response.data;
};

export const getSavedAddresses = async (): Promise<UserAddress[]> => {
  const response = await API.get<UserAddress[] | { results: UserAddress[] }>(
    "/addresses/"
  );

  return Array.isArray(response.data)
    ? response.data
    : response.data.results ?? [];
};

export const getForegroundLocationPermission = () =>
  Location.getForegroundPermissionsAsync();

export const requestForegroundLocationPermission = () =>
  Location.requestForegroundPermissionsAsync();

export const getCurrentCoordinates = async (): Promise<Coordinates> => {
  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
  };
};

export const getRecentCoordinates = async (): Promise<Coordinates | null> => {
  const result = await Location.getLastKnownPositionAsync({
    maxAge: 10 * 60 * 1000,
    requiredAccuracy: 1000,
  });

  if (!result) return null;

  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
  };
};

const uniqueParts = (parts: (string | null | undefined)[]) =>
  parts.filter(
    (part, index, values): part is string =>
      Boolean(part?.trim()) && values.indexOf(part) === index
  );

export const reverseGeocodeCoordinates = async (
  coordinates: Coordinates
): Promise<ReadableLocation> => {
  try {
    const [address] = await Location.reverseGeocodeAsync(coordinates);

    if (!address) {
      throw new Error("No address was returned for these coordinates.");
    }

    const label =
      address.district ||
      address.subregion ||
      address.city ||
      address.name ||
      "Selected area";

    const street = uniqueParts([
      address.name,
      address.streetNumber,
      address.street,
    ]).join(" ");

    const formattedAddress =
      address.formattedAddress ||
      uniqueParts([
        street,
        address.district,
        address.city,
        address.region,
        address.postalCode,
      ]).join(", ");

    return {
      label,
      formattedAddress: formattedAddress || label,
      city: address.city || undefined,
      pincode: address.postalCode || undefined,
    };
  } catch {
    return {
      label: "Selected area",
      formattedAddress: `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
    };
  }
};

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceBetweenCoordinatesKm = (
  first: Coordinates,
  second: Coordinates
): number => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
};

export const findNearbySavedAddress = (
  coordinates: Coordinates,
  addresses: UserAddress[],
  thresholdKm = 0.3
): UserAddress | null => {
  let nearest: { address: UserAddress; distance: number } | null = null;

  for (const address of addresses) {
    const latitude = Number(address.lat);
    const longitude = Number(address.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const distance = distanceBetweenCoordinatesKm(coordinates, {
      latitude,
      longitude,
    });

    if (distance <= thresholdKm && (!nearest || distance < nearest.distance)) {
      nearest = { address, distance };
    }
  }

  return nearest?.address ?? null;
};

export const getSavedAddressLabel = (address: UserAddress): string => {
  const firstLine = address.address_line
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);

  return firstLine || address.city || "Saved address";
};
