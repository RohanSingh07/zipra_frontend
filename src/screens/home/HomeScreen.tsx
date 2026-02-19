import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen({ navigation }: any) {
  const userName = "Rohan";
  const address = "Sector 62, Noida";

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        
        {/* Name + Address (Clickable) */}
        <TouchableOpacity
          onPress={() => navigation.navigate("AddressSelection")}
          style={styles.userInfo}
        >
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.address}>{address}</Text>
        </TouchableOpacity>

        {/* Profile Icon */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person-circle-outline" size={36} color={COLORS.primary} />
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  address: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
