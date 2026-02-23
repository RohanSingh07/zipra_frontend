import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
const nextSevenDaysMeals = [
  {
    id: "1",
    name: "Paneer Butter Masala",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398",
  },
  {
    id: "2",
    name: "Rajma Chawal",
    image:
      "https://images.unsplash.com/photo-1625943555419-56a2cb596640",
  },
  {
    id: "3",
    name: "Mix Veg Thali",
    image:
      "https://images.unsplash.com/photo-1546069901-eacef0df6022",
  },
];

export default function RestaurantDetailsScreen({ route, navigation  }: any) {
  const { restaurant } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HERO SECTION */}
        <Image
          source={{ uri: restaurant.image }}
          style={styles.heroImage}
        />

        {/* BASIC INFO */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.description}>
            Authentic home-style meals made fresh daily.
          </Text>
        </View>

        {/* ABOUT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>
            Maa Ka Rasoi specializes in traditional North Indian
            home-cooked meals prepared with fresh ingredients and
            zero preservatives.
          </Text>
        </View>

        {/* VIDEO SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kitchen Tour 🎥</Text>
            <Video
            source={{ uri: "https://www.w3schools.com/html/mov_bbb.mp4" }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            />
        </View>

        {/* NEXT 7 DAYS MEALS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next 7 Days Meals</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {nextSevenDaysMeals.map((meal) => (
                <TouchableOpacity
                    key={meal.id}
                    style={styles.mealCard}
                    onPress={() =>
                    navigation.navigate("MealDetails", { meal })
                    }
                >
                    <Image
                    source={{ uri: meal.image }}
                    style={styles.mealImage}
                    />
                    <Text style={styles.mealName}>{meal.name}</Text>
                </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* FULL MENU */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Menu</Text>
          <Text style={styles.sectionText}>
            Paneer Butter Masala
          </Text>
          <Text style={styles.sectionText}>
            Rajma Chawal
          </Text>
          <Text style={styles.sectionText}>
            Mix Veg Thali
          </Text>
        </View>

        {/* RATINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          <Text style={styles.sectionText}>
            ⭐ 4.6 (128 reviews)
          </Text>
          <Text style={styles.sectionText}>
            "Very homely food!"
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroImage: {
    height: 220,
    width: "100%",
  },
  infoContainer: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  description: {
    marginTop: 6,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },
  sectionText: {
    marginBottom: 6,
    color: COLORS.textSecondary,
  },
  video: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.md,
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  mealCard: {
  width: 140,
  marginRight: SPACING.md,
},

mealImage: {
  height: 100,
  borderRadius: RADIUS.md,
  marginBottom: SPACING.sm,
},

mealName: {
  fontWeight: "600",
},
});