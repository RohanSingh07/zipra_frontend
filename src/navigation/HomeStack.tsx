import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/home/HomeScreen";
import AddressSelectionScreen from "../screens/address/AddressSelectionScreen";
import MealDetailsScreen from "../screens/meal/MealDetailsScreen";
import RestaurantDetailsScreen from "../screens/restaurant/RestaurantDetailsScreen";

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} />
      <Stack.Screen name="MealDetails" component={MealDetailsScreen} />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
    </Stack.Navigator>
  );
}
