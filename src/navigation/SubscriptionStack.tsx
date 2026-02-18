import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PlansScreen from "../screens/subscription/PlansScreen";

const Stack = createNativeStackNavigator();

export default function SubscriptionStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Plans" component={PlansScreen} />
    </Stack.Navigator>
  );
}
