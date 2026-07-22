import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  TextInput,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import API from "@/src/api/client";
import { showAppAlert } from "@/src/components/ui/AppAlertHost";
import usePullToRefresh from "@/src/hooks/usePullToRefresh";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function DeliveryDetailsScreen({ route }: any) {
  const { deliveryId } = route.params;

  const [delivery, setDelivery] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);

  const [activeModal, setActiveModal] = useState<
    "portion" | "people" | "skip" | null
  >(null);

  const [selectedPortion, setSelectedPortion] = useState("");

  const [selectedPeopleCount, setSelectedPeopleCount] = useState(1);

  const [loadingAction, setLoadingAction] = useState(false);

  const [rating, setRating] = useState(0);

  const [reviewComment, setReviewComment] = useState("");

  const [reviewImages, setReviewImages] = useState<any[]>([]);

  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => {
    if (delivery) {
      setSelectedPortion(delivery.portion_size);

      setSelectedPeopleCount(delivery.people_count);
    }
  }, [delivery]);
  const handleUpdateDelivery = async () => {
    try {
      setLoadingAction(true);

      const payload: any = {};

      if (activeModal === "portion") {
        payload.portion_size = selectedPortion;
      }

      if (activeModal === "people") {
        payload.people_count = selectedPeopleCount;
      }
      console.log("UPDATE PAYLOAD", payload);
      await API.patch(`/deliveries/${deliveryId}/update/`, payload);

      await fetchDelivery();

      closeModal();
      if (activeModal === "portion") {
        showAppAlert(
          "Portion Updated",
          `Portion changed to ${selectedPortion}.`,
        );
      } else {
        showAppAlert(
          "Servings Updated",
          `Meal will now be prepared for ${selectedPeopleCount} people.`,
        );
      }
    } catch (error: any) {
      console.log("UPDATE DELIVERY ERROR", error?.response?.data);

      console.log("UPDATE DELIVERY STATUS", error?.response?.status);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSkipMeal = async () => {
    try {
      setLoadingAction(true);

      await API.post(`/deliveries/${deliveryId}/skip/`);

      await fetchDelivery();

      closeModal();
      showAppAlert(
        "Meal Skipped",
        "This delivery has been skipped successfully.",
      );
    } catch (error) {
      console.log("SKIP DELIVERY ERROR", error);

      showAppAlert("Error", "Could not skip meal.");
    } finally {
      setLoadingAction(false);
    }
  };
  const handleSubmitReview = async () => {
    try {
      setSubmittingReview(true);

      const formData = new FormData();

      formData.append("rating", String(rating));

      formData.append("comment", reviewComment);

      reviewImages.forEach((image) => {
        formData.append("files", {
          uri: image.uri,
          type: "image/jpeg",
          name: `review-${Date.now()}.jpg`,
        } as any);
      });

      await API.post(
        `/deliveries/${deliveryId}/review/`,

        formData,

        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      await fetchDelivery();

      showAppAlert("Success", "Review submitted successfully.");
    } catch (error: any) {
      console.log("REVIEW ERROR", error?.response?.data);

      showAppAlert("Error", "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const pickReviewImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,

      allowsMultipleSelection: true,

      quality: 0.8,
    });

    if (!result.canceled) {
      setReviewImages(result.assets);
    }
  };
  const openModal = (type: "portion" | "people" | "skip") => {
    setActiveModal(type);

    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);

    setActiveModal(null);
  };
  const fetchDelivery = async () => {
    try {
      const response = await API.get(`/deliveries/${deliveryId}/`);

      setDelivery(response.data);
    } catch (error) {
      console.log("DELIVERY ERROR", error);
    }
  };

  useEffect(() => {
    fetchDelivery();
  }, []);

  const refreshControl = usePullToRefresh(fetchDelivery);

  if (!delivery) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {/* IMAGE */}
        <View style={styles.carouselContainer}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={delivery.images}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Image
                source={{
                  uri: item,
                }}
                style={styles.carouselImage}
              />
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
              );

              setActiveImage(index);
            }}
          />

          {delivery.images?.length > 1 && (
            <View style={styles.pagination}>
              {delivery.images.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.dot,

                    activeImage === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.status}>{delivery.status}</Text>

          <Text style={styles.title}>{delivery.meal_name}</Text>
          <View
            style={[
              styles.deliveryTypeBadge,

              delivery.delivery_type === "subscription"
                ? styles.subscriptionBadge
                : styles.oneTimeBadge,
            ]}
          >
            <Text style={styles.deliveryTypeText}>
              {delivery.delivery_type === "subscription"
                ? "Subscription"
                : "One Time"}
            </Text>
          </View>
          <Text style={styles.meta}>
            {delivery.date}
            {" • "}
            {delivery.meal_type}
          </Text>

          <Text style={styles.kitchen}>{delivery.kitchen_name}</Text>

          {/* CURRENT SETTINGS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Preferences</Text>

            <Text style={styles.preference}>
              Portion: {delivery.portion_size}
            </Text>

            <Text style={styles.preference}>
              People Count: {delivery.people_count}
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Items</Text>

            {delivery.items?.map((item: any) => (
              <View key={item.id} style={styles.mealItemCard}>
                {item.image && (
                  <Image
                    source={{
                      uri: item.image,
                    }}
                    style={styles.mealItemImage}
                  />
                )}

                <Text style={styles.mealItemTitle}>{item.name}</Text>

                <Text style={styles.mealItemQty}>
                  {item.quantity_value} {item.quantity_unit}
                </Text>

                {item.nutrients?.length > 0 && (
                  <>
                    <Text style={styles.subSectionTitle}>Nutrition</Text>

                    {item.nutrients.map((nutrient: any, index: number) => (
                      <Text key={index} style={styles.infoText}>
                        • {nutrient.nutrient_name}: {nutrient.value}
                        {nutrient.unit}
                      </Text>
                    ))}
                  </>
                )}

                {item.ingredients?.length > 0 && (
                  <>
                    <Text style={styles.subSectionTitle}>Ingredients</Text>

                    {item.ingredients.map((ingredient: any, index: number) => (
                      <Text key={index} style={styles.infoText}>
                        • {ingredient.ingredient_name}
                      </Text>
                    ))}
                  </>
                )}
              </View>
            ))}
          </View>
          {delivery.status === "delivered" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rate Your Meal</Text>

              {delivery.is_reviewed ? (
                <View style={styles.reviewedBox}>
                  <View style={styles.reviewedBox}>
                    <Text style={styles.reviewedTitle}>Your Review</Text>

                    <View
                      style={{
                        flexDirection: "row",
                        marginBottom: 8,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                          key={star}
                          style={{
                            fontSize: 20,
                            opacity: star <= delivery.review.rating ? 1 : 0.25,
                          }}
                        >
                          ⭐
                        </Text>
                      ))}
                    </View>

                    {!!delivery.review.comment && (
                      <Text style={styles.reviewComment}>
                        {delivery.review.comment}
                      </Text>
                    )}
                    {delivery.review.media?.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{
                          marginTop: 12,
                        }}
                      >
                        {delivery.review.media.map((media: any) => (
                          <Image
                            key={media.id}
                            source={{
                              uri: media.url,
                            }}
                            style={styles.reviewImage}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                      >
                        <Text
                          style={
                            star <= rating ? styles.activeStar : styles.star
                          }
                        >
                          ⭐
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    placeholder="Tell us about your meal..."
                    multiline
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    style={styles.reviewInput}
                  />
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickReviewImages}
                  >
                    <Text>Add Photos</Text>
                  </TouchableOpacity>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {reviewImages.map((image, index) => (
                      <Image
                        key={index}
                        source={{
                          uri: image.uri,
                        }}
                        style={styles.previewImage}
                      />
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.submitReviewButton}
                    disabled={rating === 0 || submittingReview}
                    onPress={handleSubmitReview}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitReviewText}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          {/* ACTIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openModal("portion")}
            >
              <Text style={styles.actionText}>Change Meal Portion</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openModal("people")}
            >
              <Text style={styles.actionText}>Adjust People Count</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => openModal("skip")}
            >
              <Text style={styles.skipText}>Skip Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* HEADER */}

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === "portion" && "Change Portion 🍛"}

                {activeModal === "people" && "Adjust Servings 👨‍👩‍👧"}

                {activeModal === "skip" && "Skip Meal ⏭️"}
              </Text>

              <TouchableOpacity onPress={closeModal}>
                <Text style={{ fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* PORTION */}

              {activeModal === "portion" && (
                <View>
                  {["small", "medium", "large"].map((size) => {
                    const active = selectedPortion === size;

                    return (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.optionCard,

                          active && styles.optionCardActive,
                        ]}
                        onPress={() => setSelectedPortion(size)}
                      >
                        <Text
                          style={[
                            styles.optionText,

                            active && styles.optionTextActive,
                          ]}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PEOPLE */}

              {activeModal === "people" && (
                <View style={styles.peopleStepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => {
                      if (selectedPeopleCount > 1) {
                        setSelectedPeopleCount(selectedPeopleCount - 1);
                      }
                    }}
                  >
                    <Text style={styles.stepperButtonText}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.peopleCountText}>
                    {selectedPeopleCount}
                  </Text>

                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() =>
                      setSelectedPeopleCount(selectedPeopleCount + 1)
                    }
                  >
                    <Text style={styles.stepperButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* SKIP */}

              {activeModal === "skip" && (
                <View>
                  <Text style={styles.skipDescription}>
                    Are you sure you want to skip this meal?
                  </Text>

                  <Text style={styles.skipSubText}>
                    You may not be able to restore this delivery later.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.continueButton}
              disabled={loadingAction}
              onPress={() => {
                if (activeModal === "skip") {
                  handleSkipMeal();
                } else {
                  handleUpdateDelivery();
                }
              }}
            >
              {loadingAction ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueButtonText}>
                  {activeModal === "skip" ? "Skip Meal" : "Save Changes"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  image: {
    width: "100%",
    height: 260,
  },

  content: {
    padding: 20,
  },

  status: {
    color: "#16A34A",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    marginTop: 10,
  },

  meta: {
    marginTop: 8,
    color: "#6B7280",
  },

  kitchen: {
    marginTop: 6,
    color: "#6B7280",
  },

  section: {
    marginTop: 30,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  preference: {
    fontSize: 16,
    marginBottom: 10,
  },

  actionButton: {
    backgroundColor: "#F3F4F6",

    paddingVertical: 16,

    borderRadius: 16,

    alignItems: "center",

    marginBottom: 14,
  },

  actionText: {
    fontWeight: "600",
  },

  skipButton: {
    backgroundColor: "#FEE2E2",

    paddingVertical: 16,

    borderRadius: 16,

    alignItems: "center",
  },

  skipText: {
    color: "#DC2626",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#fff",

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    padding: 24,

    height: "60%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  optionCard: {
    paddingVertical: 18,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    alignItems: "center",

    marginBottom: 14,
  },

  optionCardActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  optionText: {
    fontWeight: "700",
    textTransform: "capitalize",
  },

  optionTextActive: {
    color: "#fff",
  },

  replaceText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },

  continueButton: {
    marginTop: 20,

    backgroundColor: "#16A34A",

    paddingVertical: 18,

    borderRadius: 16,

    alignItems: "center",
  },

  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  peopleStepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginTop: 40,
  },

  stepperButton: {
    width: 52,
    height: 52,

    borderRadius: 26,

    backgroundColor: "#16A34A",

    alignItems: "center",
    justifyContent: "center",
  },

  stepperButtonText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },

  peopleCountText: {
    fontSize: 28,
    fontWeight: "700",

    marginHorizontal: 30,
  },
  skipDescription: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 28,
  },

  skipSubText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 24,
  },
  mealItemCard: {
    backgroundColor: "#F9FAFB",

    padding: 16,

    borderRadius: 16,

    marginBottom: 16,
  },

  mealItemTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  mealItemQty: {
    color: "#6B7280",

    marginTop: 4,
  },

  subSectionTitle: {
    marginTop: 12,

    marginBottom: 6,

    fontWeight: "700",
  },

  infoText: {
    color: "#4B5563",

    marginBottom: 4,
  },
  mealItemImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",

    marginBottom: 16,
  },

  star: {
    fontSize: 34,

    opacity: 0.3,

    marginRight: 8,
  },

  activeStar: {
    fontSize: 34,

    marginRight: 8,
  },

  reviewInput: {
    minHeight: 120,

    borderWidth: 1,

    borderColor: "#E5E7EB",

    borderRadius: 16,

    padding: 16,

    textAlignVertical: "top",

    marginBottom: 16,
  },

  submitReviewButton: {
    backgroundColor: "#16A34A",

    paddingVertical: 16,

    borderRadius: 16,

    alignItems: "center",
  },

  submitReviewText: {
    color: "#fff",

    fontWeight: "700",
  },

  reviewedBox: {
    backgroundColor: "#DCFCE7",

    padding: 16,

    borderRadius: 16,
  },

  reviewedText: {
    color: "#15803D",

    fontWeight: "700",
  },
  reviewedTitle: {
    fontWeight: "700",

    marginBottom: 8,
  },

  reviewRating: {
    fontSize: 18,

    marginBottom: 8,
  },

  reviewComment: {
    color: "#4B5563",
  },
  uploadButton: {
    backgroundColor: "#F3F4F6",

    paddingVertical: 14,

    borderRadius: 12,

    alignItems: "center",

    marginBottom: 12,
  },

  previewImage: {
    width: 80,

    height: 80,

    borderRadius: 12,

    marginRight: 8,

    marginBottom: 12,
  },
  reviewImage: {
    width: 90,

    height: 90,

    borderRadius: 12,

    marginRight: 10,
  },
  carouselContainer: {
    marginBottom: 20,
  },

  carouselImage: {
    width: SCREEN_WIDTH - 32,

    height: 260,

    borderRadius: 16,
  },

  pagination: {
    flexDirection: "row",

    justifyContent: "center",

    marginTop: 10,
  },

  dot: {
    width: 8,

    height: 8,

    borderRadius: 4,

    backgroundColor: "#ccc",

    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: "#ff6b35",
  },
  deliveryTypeBadge: {
    alignSelf: "flex-start",

    paddingHorizontal: 8,

    paddingVertical: 4,

    borderRadius: 12,

    marginTop: 6,
  },

  subscriptionBadge: {
    backgroundColor: "#E8F5E9",
  },

  oneTimeBadge: {
    backgroundColor: "#FFF3E0",
  },

  deliveryTypeText: {
    fontSize: 12,

    fontWeight: "600",
  },
});
