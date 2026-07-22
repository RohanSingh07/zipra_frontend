import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/home/HomeScreen";
import LocationSelectionScreen from "../screens/address/LocationSelectionScreen";
import LocationMapScreen from "../screens/address/LocationMapScreen";
import RestaurantDetailsScreen from "../screens/restaurant/RestaurantDetailsScreen";
import SearchScreen from "../screens/search/SearchScreen";
import MealDetailsScreen from "../screens/meal/MealDetailsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import MealItemDetailScreen from "../screens/meal/MealItemDetailScreen";
import AllReviewsScreen from "../screens/restaurant/AllReviewsScreen";
import KitchenMealSelectorScreen from "../screens/meal/KitchenMealSelectorScreen";
import OrderCheckoutScreen from "../screens/restaurant/OrderCheckoutScreen";
import OrderSuccessScreen from "../screens/restaurant/OrderSuccessScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddressSelection"
        component={LocationSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LocationMap"
        component={LocationMapScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RestaurantDetails"
        component={RestaurantDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MealDetails" component={MealDetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MealItemDetails" component={MealItemDetailScreen} />
      <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
      <Stack.Screen
        name="KitchenMealSelector"
        component={KitchenMealSelectorScreen}
        options={{
          title: "Select Meals",
        }}
      />
      <Stack.Screen
        name="OrderCheckout"
        component={OrderCheckoutScreen}
        options={{
          title: "Checkout",
        }}
      />
      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{
          headerShown: false,
        }}
      />
      
    </Stack.Navigator>
  );
}