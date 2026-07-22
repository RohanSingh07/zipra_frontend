import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import API from "../../api/client";
import AppButton from "../../components/AppButton";
import { COLORS } from "../../constants/theme";

const AUTH_SLIDES = [
  {
    id: "homestyle-meals",
    image: require("../../../assets/auth/consumer-homestyle.jpg"),
    accessibilityLabel: "A fresh homestyle Indian meal served in a thali.",
  },
  {
    id: "daily-delivery",
    image: require("../../../assets/auth/consumer-delivery.jpg"),
    accessibilityLabel: "A fresh meal being delivered at home.",
  },
  {
    id: "weekly-variety",
    image: require("../../../assets/auth/consumer-variety.jpg"),
    accessibilityLabel: "A varied selection of balanced Indian meals.",
  },
] as const;

function getAuthErrorMessage(error: any) {
  const data = error?.response?.data;

  if (!data) {
    return "We could not connect to Zipra. Check your connection and try again.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.message) {
    return data.message;
  }

  if (Array.isArray(data.phone)) {
    return data.phone.join(", ");
  }

  if (typeof data.phone === "string") {
    return data.phone;
  }

  return "We could not send the OTP. Please try again.";
}

export default function LoginScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<ScrollView>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const loginPanelRef = useRef<View>(null);
  const loginPanelTranslateY = useRef(new Animated.Value(0)).current;

  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const isTablet = width >= 768;
  const fallbackCarouselWidth = isTablet ? Math.min(width - 64, 620) : width;
  const slideWidth = carouselWidth || fallbackCarouselWidth;

  useEffect(() => {
    if (!carouselWidth) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const nextIndex = (activeSlide + 1) % AUTH_SLIDES.length;

      carouselRef.current?.scrollTo({
        x: nextIndex * carouselWidth,
        animated: true,
      });

      setActiveSlide(nextIndex);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [activeSlide, carouselWidth]);

  useEffect(() => {
    const movePanelAboveKeyboard = (event: KeyboardEvent) => {
      requestAnimationFrame(() => {
        loginPanelRef.current?.measureInWindow(
          (_x, panelY, _width, panelHeight) => {
            const panelBottom = panelY + panelHeight;
            const keyboardTop = event.endCoordinates.screenY;
            const overlap = Math.max(0, panelBottom - keyboardTop + 16);

            Animated.timing(loginPanelTranslateY, {
              toValue: -overlap,
              duration: 230,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start();
          },
        );
      });
    };

    const restorePanelPosition = () => {
      Animated.timing(loginPanelTranslateY, {
        toValue: 0,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const keyboardShowListener = Keyboard.addListener(
      "keyboardDidShow",
      movePanelAboveKeyboard,
    );
    const keyboardHideListener = Keyboard.addListener(
      "keyboardDidHide",
      restorePanelPosition,
    );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [loginPanelTranslateY]);

  const handleCarouselLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (!nextWidth) {
      return;
    }

    setCarouselWidth(nextWidth);

    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        x: activeSlide * nextWidth,
        animated: false,
      });
    });
  };

  const handleCarouselScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (!carouselWidth) {
      return;
    }

    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / carouselWidth,
    );

    setActiveSlide(Math.max(0, Math.min(nextIndex, AUTH_SLIDES.length - 1)));
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10));

    if (fieldError) {
      setFieldError("");
    }

    if (requestError) {
      setRequestError("");
    }
  };

  const validatePhone = () => {
    if (!phone) {
      setFieldError("Enter your mobile number.");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setFieldError("Enter a valid 10-digit Indian mobile number.");
      return false;
    }

    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone()) {
      phoneInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      setRequestError("");

      await API.post("/auth/send-otp/", { phone });
      Keyboard.dismiss();
      navigation.navigate("OTP", { phone });
    } catch (error: any) {
      console.warn("OTP request failed", error?.response?.data || error?.message);
      setRequestError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View
        style={[
          styles.screenContent,
          isTablet && styles.screenContentTablet,
          isTablet && {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View
          onLayout={handleCarouselLayout}
          style={[
            styles.carouselViewport,
            isTablet && styles.carouselViewportTablet,
          ]}
        >
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCarouselScrollEnd}
          >
            {AUTH_SLIDES.map((slide) => (
              <View key={slide.id} style={{ width: slideWidth }}>
                <Image
                  accessible
                  accessibilityLabel={slide.accessibilityLabel}
                  source={slide.image}
                  resizeMode="cover"
                  style={styles.slideImage}
                />
              </View>
            ))}
          </ScrollView>

          <View pointerEvents="none" style={styles.paginationDots}>
            {AUTH_SLIDES.map((slide, index) => (
              <View
                key={`${slide.id}-dot`}
                style={[
                  styles.paginationDot,
                  index === activeSlide && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <Animated.View
          style={{ transform: [{ translateY: loginPanelTranslateY }] }}
        >
          <View
            ref={loginPanelRef}
            style={[
              styles.loginPanel,
              isTablet && styles.loginPanelTablet,
              { paddingBottom: Math.max(22, insets.bottom + 10) },
            ]}
          >
            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeMark}>
                <Text style={styles.brandBadgeMarkText}>Z</Text>
              </View>
              <Text style={styles.brandBadgeText}>ZIPRA</Text>
            </View>

            <Text style={styles.title}>Login or sign up</Text>
            <Text style={styles.subtitle}>
              Fresh homestyle meals, planned around your day.
            </Text>

            <View style={styles.formBlock}>
              <Text style={styles.inputLabel}>Mobile number</Text>

              <Pressable
                onPress={() => phoneInputRef.current?.focus()}
                style={[
                  styles.phoneField,
                  Boolean(fieldError) && styles.phoneFieldError,
                ]}
              >
                <View style={styles.countryCodeBlock}>
                  <Text style={styles.countryCode}>+91</Text>
                </View>
                <View style={styles.inputDivider} />
                <TextInput
                  ref={phoneInputRef}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onSubmitEditing={handleSendOtp}
                  placeholder="98765 43210"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  importantForAutofill="yes"
                  maxLength={10}
                  editable={!loading}
                  selectionColor={COLORS.primary}
                  accessibilityLabel="Mobile number"
                  accessibilityHint="Enter your 10-digit Indian mobile number"
                  style={styles.phoneInput}
                />
              </Pressable>

              {fieldError ? (
                <Text style={styles.fieldError}>{fieldError}</Text>
              ) : (
                <Text style={styles.inputHelper}>
                  We’ll send an OTP to verify your number.
                </Text>
              )}

              {requestError ? (
                <View style={styles.requestErrorBox}>
                  <Text style={styles.requestErrorText}>{requestError}</Text>
                </View>
              ) : null}
            </View>

            <AppButton
              title="Continue"
              onPress={handleSendOtp}
              loading={loading}
              style={styles.continueButton}
            />

            <Text style={styles.termsText}>
              By continuing, you agree to Zipra’s Terms of Service and Privacy
              Policy.
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
  },
  screenContent: {
    flex: 1,
    width: "100%",
  },
  screenContentTablet: {
    maxWidth: 620,
    alignSelf: "center",
  },
  carouselViewport: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
    backgroundColor: COLORS.secondaryBackground,
  },
  carouselViewportTablet: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  paginationDots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
  },
  paginationDotActive: {
    width: 22,
    backgroundColor: COLORS.white,
  },
  loginPanel: {
    width: "100%",
    paddingTop: 22,
    paddingHorizontal: 22,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 1,
  },
  loginPanelTablet: {
    marginTop: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 30,
    shadowColor: "#5F361C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  brandBadgeMark: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  brandBadgeMarkText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },
  brandBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.7,
    marginTop: 15,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  formBlock: {
    marginTop: 18,
  },
  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  phoneField: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 15,
    backgroundColor: COLORS.card,
  },
  phoneFieldError: {
    borderColor: COLORS.error,
  },
  countryCodeBlock: {
    paddingLeft: 16,
    paddingRight: 13,
  },
  countryCode: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  inputDivider: {
    width: 1,
    height: 25,
    backgroundColor: COLORS.border,
  },
  phoneInput: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  inputHelper: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  fieldError: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 7,
  },
  requestErrorBox: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  },
  requestErrorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  continueButton: {
    marginTop: 18,
  },
  termsText: {
    maxWidth: 420,
    alignSelf: "center",
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 12,
  },
});
