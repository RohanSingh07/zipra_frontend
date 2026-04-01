import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/home/HomeScreen";
import AddressSelectionScreen from "../screens/address/AddressSelectionScreen";
import RestaurantDetailsScreen from "../screens/restaurant/RestaurantDetailsScreen";
import SearchScreen from "../screens/search/SearchScreen";
import MealDetailsScreen from "../screens/meal/MealDetailsScreen";
const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
      <Stack.Screen name="MealDetails" component={MealDetailsScreen} />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen} 
      />
    </Stack.Navigator>
  );
}
