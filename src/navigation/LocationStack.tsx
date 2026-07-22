import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LocationMapScreen from "../screens/address/LocationMapScreen";
import LocationSelectionScreen from "../screens/address/LocationSelectionScreen";

const Stack = createNativeStackNavigator();

export default function LocationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="LocationSelection"
        component={LocationSelectionScreen}
      />
      <Stack.Screen name="LocationMap" component={LocationMapScreen} />
    </Stack.Navigator>
  );
}
