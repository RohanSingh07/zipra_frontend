import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PlansScreen from "../screens/subscription/PlansScreen";
import MealDetailsScreen from "../screens/meal/MealDetailsScreen";
const Stack = createNativeStackNavigator();

export default function SubscriptionStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="MealDetails" component={MealDetailsScreen} />
    </Stack.Navigator>
  );
}
