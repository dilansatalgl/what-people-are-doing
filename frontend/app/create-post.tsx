import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

const MAX_TEXT_LENGTH = 280;

export default function CreatePostScreen() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [text, setText] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ready" | "denied"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchLocation();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current === "background" && nextState === "active") {
        fetchLocation();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const fetchLocation = async () => {
    setLocationStatus("loading");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationStatus("denied");
      return;
    }
    const coords = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: coords.coords.latitude,
      longitude: coords.coords.longitude,
    });
    setLocationStatus("ready");
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your camera."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0]);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!image) {
      setErrorMessage("A photo is required to post.");
      return;
    }
    if (!location) {
      setErrorMessage("Location access is required to post.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const formData = new FormData();
      const filename = image.uri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("image", {
        uri: image.uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));
      if (text.trim()) {
        formData.append("text", text.trim());
      }

      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        router.back();
        return;
      }

      if (response.status === 400) {
        setErrorMessage(data.message || "Invalid post data.");
        return;
      }

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 409) {
        setErrorMessage("You already have an active post.");
        return;
      }

      if (response.status === 413) {
        setErrorMessage("Image is too large. Please use an image smaller than 5 MB.");
        return;
      }

      if (response.status === 429) {
        const remaining = data.remainingSeconds
          ? `Please wait ${Math.ceil(data.remainingSeconds / 60)} more minute(s) before posting again.`
          : "Please wait before posting again.";
        setErrorMessage(remaining);
        return;
      }

      if (response.status === 500) {
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }

      setErrorMessage(data.message || "Something went wrong.");
    } catch (error) {
      setErrorMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const locationLabel = () => {
    if (locationStatus === "loading") return "Getting location...";
    if (locationStatus === "denied")
      return "Location access denied — tap to retry";
    if (locationStatus === "ready") return "Location ready";
    return "Fetching location...";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} disabled={loading}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !image}
            style={[
              styles.headerPostBtn,
              !image && styles.headerPostBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.headerPostText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.imagePicker, image && styles.imagePickerFilled]}
            onPress={handlePickImage}
            disabled={loading}
            activeOpacity={0.8}
          >
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>+</Text>
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                <Text style={styles.imagePlaceholderHint}>Required</Text>
              </View>
            )}
          </TouchableOpacity>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What are you doing? (optional)"
              placeholderTextColor="#5A5A5A"
              multiline
              maxLength={MAX_TEXT_LENGTH}
              value={text}
              onChangeText={(v: string) => { setText(v); setErrorMessage(null); }}
              editable={!loading}
            />
            <Text style={styles.charCount}>
              {text.length}/{MAX_TEXT_LENGTH}
            </Text>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.locationRow}
              onPress={locationStatus === "denied" ? () => Linking.openSettings() : undefined}
              disabled={locationStatus === "loading" || locationStatus === "ready"}
            >
              <View
                style={[
                  styles.locationDot,
                  locationStatus === "ready" && styles.locationDotReady,
                  locationStatus === "denied" && styles.locationDotDenied,
                ]}
              />
              <Text
                style={[
                  styles.locationText,
                  locationStatus === "denied" && styles.locationTextDenied,
                ]}
              >
                {locationLabel()}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerCancel: {
    color: "#A3A3A3",
    fontSize: 15,
  },
  headerPostBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  headerPostBtnDisabled: {
    opacity: 0.35,
  },
  headerPostText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  imagePicker: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#0D0D0D",
  },
  imagePickerFilled: {
    borderStyle: "solid",
    borderColor: "#333333",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePlaceholderIcon: {
    color: "#444444",
    fontSize: 40,
    fontWeight: "200",
    lineHeight: 44,
  },
  imagePlaceholderText: {
    color: "#666666",
    fontSize: 15,
    fontWeight: "600",
  },
  imagePlaceholderHint: {
    color: "#3A3A3A",
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: "#2A0A0A",
    borderWidth: 1,
    borderColor: "#5C1A1A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#EF4444",
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#262626",
  },
  label: {
    color: "#F5F5F5",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#444444",
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#1E1E1E",
    marginVertical: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3A3A3A",
  },
  locationDotReady: {
    backgroundColor: "#4ADE80",
  },
  locationDotDenied: {
    backgroundColor: "#EF4444",
  },
  locationText: {
    color: "#888888",
    fontSize: 13,
  },
  locationTextDenied: {
    color: "#EF4444",
  },
});
