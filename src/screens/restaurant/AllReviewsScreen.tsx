import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { useState } from "react";

import API from "@/src/api/client";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < rating ? "star" : "star-outline"}
      size={16}
      color="#FFD700"
      style={{ marginRight: 2 }}
    />
  ));
};

function ReviewVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <VideoView
      style={styles.reviewMediaImage}
      player={player}
      nativeControls
    />
  );
}

export default function AllReviewsScreen({ route, navigation }: any) {
  const [kitchen, setKitchen] = useState(route.params.kitchen);

  const refreshReviews = async () => {
    if (!kitchen?.slug) return;

    const response = await API.get(`/kitchens/${kitchen.slug}/`);
    setKitchen(response.data);
  };
  const refreshControl = usePullToRefresh(refreshReviews);

  const ReviewCard = ({ review }: any) => (
    <View style={styles.reviewCard}>
      {/* Rating Stars */}
      <View style={styles.reviewStarsContainer}>
        {renderStars(review.rating)}
      </View>

      {/* Review Comment */}
      <Text style={styles.reviewComment}>
        {review.comment}
      </Text>

      {/* Review Media */}
      {review.media && review.media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reviewMediaContainer}
        >
          {review.media.map((item: any, index: number) => (
            <View
              key={`${review.id}-media-${index}`}
              style={styles.reviewMediaItem}
            >
              {item.media_type === "image" ? (
                <Image
                  source={{ uri: item.url }}
                  style={styles.reviewMediaImage}
                />
              ) : (
                <ReviewVideo uri={item.url} />
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* User Info */}
      <View style={styles.reviewUserContainer}>
        <View style={styles.reviewUserAvatar} />
        <View style={styles.reviewUserInfo}>
          <Text style={styles.reviewUserName}>
            {review.user_name}
          </Text>
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString()}
          </Text>
        </View>
        {review.media && review.media.length > 0 && review.media[0]?.is_verified_purchase && (
          <View style={styles.verifiedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#16A34A"
            />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.ratingSection}>
        <Text style={styles.overallRating}>
          {kitchen.avg_rating}
        </Text>
        <View>
          <View style={styles.starsRow}>
            {renderStars(Math.round(kitchen.avg_rating))}
          </View>
          <Text style={styles.totalReviews}>
            {kitchen.total_reviews} reviews
          </Text>
        </View>
      </View>

      <FlatList
        data={kitchen.reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ReviewCard review={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={refreshControl}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  ratingSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: "#F9FAFB",
  },
  overallRating: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: SPACING.md,
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  totalReviews: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reviewStarsContainer: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    fontWeight: "400",
  },
  reviewMediaContainer: {
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  reviewMediaItem: {
    marginRight: SPACING.sm,
  },
  reviewMediaImage: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.sm,
  },
  reviewUserContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  reviewUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  verifiedText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    marginLeft: 4,
  },
});
