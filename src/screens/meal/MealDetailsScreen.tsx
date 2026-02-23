import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { useState } from "react";


const { width } = Dimensions.get("window");
type PortionType = "small" | "medium" | "heavy";

interface PortionOption {
  id: PortionType;
  label: string;
  weight: string;
}



export default function MealDetailsScreen({ route }: any) {
    const { meal } = route.params;

    const [selectedPortion, setSelectedPortion] = useState<PortionType>("medium");

    const portions: PortionOption[] = [
        { id: "small", label: "Small", weight: "500g" },
        { id: "medium", label: "Medium", weight: "750g" },
        { id: "heavy", label: "Heavy", weight: "1kg" },
    ];
    const images = [
        meal.image,
        "https://images.unsplash.com/photo-1604908176997-431b3d16f1d3",
    ];
    const baseNutrition = meal.baseNutrition ?? {
    calories: 650,
    protein: 25,
    carbs: 60,
    fats: 20,
    fiber: 8,
    };
    const portionMultiplier: Record<PortionType, number> = {
    small: 0.67,
    medium: 1,
    heavy: 1.33,
    };
    const multiplier = portionMultiplier[selectedPortion];

    const nutrition = {
    calories: Math.round(baseNutrition.calories * multiplier),
    protein: (baseNutrition.protein * multiplier).toFixed(1),
    carbs: (baseNutrition.carbs * multiplier).toFixed(1),
    fats: (baseNutrition.fats * multiplier).toFixed(1),
    fiber: (baseNutrition.fiber * multiplier).toFixed(1),
    };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* IMAGE CAROUSEL */}
        <ScrollView horizontal pagingEnabled>
          {images.map((img, index) => (
            <Image
              key={index}
              source={{ uri: img }}
              style={styles.image}
            />
          ))}
        </ScrollView>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.title}>{meal.name}</Text>

          <Text style={styles.description}>
            Freshly prepared home-style meal with rich flavors and
            balanced spices. Cooked hygienically using premium
            ingredients.
          </Text>
          {/* PORTION SIZE */}
            <Text style={styles.sectionTitle}>Choose Portion Size</Text>

            <View style={styles.portionContainer}>
            {portions.map((portion) => (
                <TouchableOpacity
                key={portion.id}
                style={[
                    styles.portionButton,
                    selectedPortion === portion.id && styles.selectedPortion,
                ]}
                onPress={() => setSelectedPortion(portion.id)}
                >
                <Text
                    style={[
                    styles.portionText,
                    selectedPortion === portion.id && styles.selectedPortionText,
                    ]}
                >
                    {portion.label}
                </Text>
                <Text
                    style={[
                    styles.weightText,
                    selectedPortion === portion.id && styles.selectedPortionText,
                    ]}
                >
                    {portion.weight}
                </Text>
                </TouchableOpacity>
            ))}
            </View>

          {/* META INFO */}
          <View style={styles.metaSection}>
            <Text style={styles.metaText}>🔥 650 kcal</Text>
            <Text style={styles.metaText}>⏱ 25 mins</Text>
            <Text style={styles.metaText}>🕒 Prepared at 11:30 AM</Text>
          </View>

          {/* NUTRITION */}
          <Text style={styles.sectionTitle}>Nutritional Information</Text>
          <View style={styles.nutritionBox}>
            <Text>Calories: {nutrition.calories} kcal</Text>
            <Text>Protein: {nutrition.protein}g</Text>
            <Text>Carbs: {nutrition.carbs}g</Text>
            <Text>Fats: {nutrition.fats}g</Text>
            <Text>Fiber: {nutrition.fiber}g</Text>
            
          </View>

          {/* RATING */}
          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          <Text style={styles.rating}>⭐ 4.5 (120 reviews)</Text>
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
  image: {
    width: width,
    height: 250,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: SPACING.md,
  },
  description: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  metaText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },
  nutritionBox: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  rating: {
    fontSize: 16,
    fontWeight: "600",
  },
  portionContainer: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: SPACING.lg,
},

portionButton: {
  flex: 1,
  backgroundColor: COLORS.card,
  padding: SPACING.md,
  borderRadius: RADIUS.md,
  marginRight: SPACING.sm,
  alignItems: "center",
},

selectedPortion: {
  backgroundColor: COLORS.primary,
},

portionText: {
  fontWeight: "bold",
  marginBottom: 4,
},

weightText: {
  fontSize: 12,
  color: COLORS.textSecondary,
},

selectedPortionText: {
  color: "#fff",
},
});