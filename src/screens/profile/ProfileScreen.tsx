import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout }
      ]
    );
  };

  const MenuItem = ({ title, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* Top User Info */}
      <View style={styles.header}>
        <Text style={styles.name}>
          {user?.name || "Guest User"}
        </Text>
        <Text style={styles.phone}>
          {user?.phone}
        </Text>
      </View>

      {/* Options */}
      <View style={styles.menu}>
        <MenuItem title="Order History" onPress={() => {}} />
        <MenuItem title="Next Meal" onPress={() => {}} />
        <MenuItem title="Favorites" onPress={() => {}} />
        <MenuItem title="Saved Addresses" onPress={() => {}} />
        <MenuItem title="Help & Support" onPress={() => {}} />
      </View>

      {/* Logout */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },

  phone: {
    marginTop: 4,
    color: COLORS.textSecondary,
  },

  menu: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
  },

  menuItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },

  menuText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  footer: {
    marginTop: "auto",
    padding: SPACING.lg,
  },

  logoutBtn: {
    backgroundColor: "#ff4d4f",
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});