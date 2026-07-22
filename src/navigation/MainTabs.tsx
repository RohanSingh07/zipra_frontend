import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../constants/theme";
import { useUIStore } from "../store/uiStore";
import HomeStack from "./HomeStack";
import MealsStack from "./MealsStack";
import SubscriptionStack from "./SubscriptionStack";

const Tab = createBottomTabNavigator();

function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = useUIStore((state) => state.tabBarVisible);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 92 + insets.bottom,
      duration: visible ? 190 : 230,
      useNativeDriver: true,
    }).start();
  }, [insets.bottom, translateY, visible]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.tabTray,
        {
          bottom: Math.max(insets.bottom, 10),
          transform: [{ translateY }],
        },
      ]}
    >
      <BottomTabBar
        {...props}
        insets={{ ...props.insets, bottom: 0 }}
      />
    </Animated.View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#76645B",
        tabBarActiveBackgroundColor: "#FFF0E3",
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          marginTop: 0,
          marginBottom: 6,
          fontSize: 9,
          fontWeight: "800",
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
        tabBarStyle: {
          height: 54,
          paddingTop: 0,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          borderRadius: 17,
          overflow: "hidden",
        },
        tabBarItemStyle: {
          marginHorizontal: 0,
          marginVertical: 0,
          borderRadius: 17,
          overflow: "hidden",
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<
            string,
            React.ComponentProps<typeof Ionicons>["name"]
          > = {
            Home: focused ? "home" : "home-outline",
            Meals: focused ? "fast-food" : "fast-food-outline",
            Subscriptions: focused ? "calendar" : "calendar-outline",
          };

          return (
            <Ionicons
              name={icons[route.name] ?? "ellipse-outline"}
              size={focused ? 20 : 19}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Meals" component={MealsStack} />
      <Tab.Screen name="Subscriptions" component={SubscriptionStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabTray: {
    position: "absolute",
    left: 18,
    right: 18,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    shadowColor: "#111827",
    shadowOpacity: 0.15,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
  },
});