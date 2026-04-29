import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Heatmap,
  PROVIDER_GOOGLE,
  type MapStyleElement,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../constants/api";
import { getAuthToken } from "../../utils/authStorage";

type HeatmapApiPoint = {
  latitude: number;
  longitude: number;
  weight: number;
};

type HeatmapResponse = {
  success?: boolean;
  data?: HeatmapApiPoint[];
  message?: string;
};

const HEATMAP_REFRESH_INTERVAL_MS = 60000;
const WORLD_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 100,
  longitudeDelta: 220,
};

const GRAYSCALE_MAP_STYLE: MapStyleElement[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1B1B1B" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#9A9A9A" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1B1B1B" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#555555" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2B2B2B" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8A8A8A" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#080808" }],
  },
];

const HEATMAP_GRADIENT = {
  colors: ["#5C5C5C", "#CFCFCF", "#FFFFFF"],
  startPoints: [0.2, 0.65, 1],
  colorMapSize: 256,
};

const normalizeHeatmapPoints = (points: HeatmapApiPoint[] | undefined) => {
  if (!Array.isArray(points)) {
    return [];
  }

  return points.filter(
    (point) =>
      Number.isFinite(point.latitude) &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      Number.isFinite(point.longitude) &&
      point.longitude >= -180 &&
      point.longitude <= 180 &&
      Number.isFinite(point.weight) &&
      point.weight > 0,
  );
};

export default function HeatmapScreen() {
  const pathname = usePathname();
  const [points, setPoints] = useState<HeatmapApiPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasLoadedHeatmap = useRef(false);
  const requestInFlight = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadHeatmap = useCallback(
    async ({
      showLoading = false,
      showRefreshing = false,
    }: {
      showLoading?: boolean;
      showRefreshing?: boolean;
    } = {}) => {
      if (requestInFlight.current) {
        return;
      }

      requestInFlight.current = true;

      if (showLoading) {
        setLoading(true);
      }

      if (showRefreshing) {
        setRefreshing(true);
      }

      setErrorMessage(null);

      try {
        const token = await getAuthToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/heatmap`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = (await response.json()) as HeatmapResponse;

        if (!response.ok || data.success === false) {
          setErrorMessage(data.message || "Could not load heatmap data.");
          return;
        }

        if (!Array.isArray(data.data)) {
          setErrorMessage("Heatmap data was not in the expected format.");
          return;
        }

        setPoints(normalizeHeatmapPoints(data.data));
      } catch (error) {
        console.error("Heatmap load error:", error);
        setErrorMessage("Could not connect to the server.");
      } finally {
        requestInFlight.current = false;

        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (pathname !== "/heatmap") {
      return;
    }

    const showLoading = !hasLoadedHeatmap.current;
    hasLoadedHeatmap.current = true;
    void loadHeatmap({ showLoading });

    const timer = setInterval(() => {
      void loadHeatmap();
    }, HEATMAP_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [loadHeatmap, pathname]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={WORLD_REGION}
        customMapStyle={GRAYSCALE_MAP_STYLE}
        loadingEnabled
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
      >
        {points.length > 0 ? (
          <Heatmap
            points={points}
            radius={40}
            opacity={0.9}
            gradient={HEATMAP_GRADIENT}
          />
        ) : null}
      </MapView>

      <View pointerEvents="box-none" style={styles.topBar}>
        <View style={styles.titlePill}>
          <Ionicons name="flame-outline" size={18} color="#FFFFFF" />
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.84}
            numberOfLines={1}
            style={styles.titleText}
          >
            Activity Heatmap
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Refresh heatmap"
          accessibilityRole="button"
          style={[
            styles.refreshButton,
            (loading || refreshing) && styles.refreshButtonDisabled,
          ]}
          onPress={() => void loadHeatmap({ showRefreshing: true })}
          disabled={loading || refreshing}
        >
          {loading || refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={21} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {loading ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : errorMessage ? (
        <View pointerEvents="none" style={styles.messageOverlay}>
          <Text style={styles.messageTitle}>Could not load heatmap</Text>
          <Text style={styles.messageText}>{errorMessage}</Text>
        </View>
      ) : points.length === 0 ? (
        <View pointerEvents="none" style={styles.messageOverlay}>
          <Text style={styles.messageTitle}>No active posts right now</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 72,
    left: 28,
    right: 28,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titlePill: {
    minHeight: 44,
    maxWidth: "74%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 22,
    backgroundColor: "#242424",
    paddingHorizontal: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 7,
  },
  titleText: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  refreshButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 7,
  },
  refreshButtonDisabled: {
    opacity: 0.72,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  messageOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "rgba(12, 12, 12, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  messageText: {
    color: "#B8B8B8",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
