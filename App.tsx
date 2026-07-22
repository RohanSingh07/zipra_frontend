import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppAlertHost from "./src/components/ui/AppAlertHost";
import { COLORS } from "./src/constants/theme";
import { useLocationBootstrap } from "./src/hooks/useLocationBootstrap";
import AuthStack from "./src/navigation/AuthStack";
import LocationStack from "./src/navigation/LocationStack";
import MainTabs from "./src/navigation/MainTabs";
import { useAuthStore } from "./src/store/authStore";
import { useLocationStore } from "./src/store/locationStore";

const RootStack = createNativeStackNavigator();

function RootNavigator() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const initialize = useAuthStore((state) => state.initialize);
  const selectedLocation = useLocationStore(
    (state) => state.selectedLocation
  );
  const { hasHydrated, bootstrapComplete } = useLocationBootstrap(user?.id);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (loading || (user && (!hasHydrated || !bootstrapComplete))) {
    return <AppLoadingScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user && selectedLocation ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : user ? (
        <RootStack.Screen name="Location" component={LocationStack} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthStack} />
      )}
    </RootStack.Navigator>
  );
}

function AppLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingMark}>
        <Text style={styles.loadingLetter}>Z</Text>
      </View>
      <Text style={styles.loadingBrand}>ZIPRA</Text>
      <ActivityIndicator style={styles.loadingSpinner} color={COLORS.primary} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <AppAlertHost />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  loadingMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  loadingLetter: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "900",
  },
  loadingBrand: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },
  loadingSpinner: {
    marginTop: 24,
  },
});
