import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import MealsScreen from "../screens/meal/MealsScreen";
import DeliveryDetailsScreen from "../screens/meal/DeliveryDetailsScreen";

const Stack =
  createNativeStackNavigator();

export default function MealsStack() {

  return (

    <Stack.Navigator>

      <Stack.Screen
        name="MealsMain"
        component={MealsScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="DeliveryDetails"
        component={
          DeliveryDetailsScreen
        }
      />
      

    </Stack.Navigator>
  );
}