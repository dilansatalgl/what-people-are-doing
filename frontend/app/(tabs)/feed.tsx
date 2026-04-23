import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PostCard, type FeedPost } from "../../components/posts/PostCard";
import { API_BASE_URL, FEED_POLL_INTERVAL_MS } from "../../constants/api";

type FeedApiPost = {
  postId: string;
  text: string;
  image: string;
  createdAt: string;
  locationName: string | null;
  coordinates: {
    longitude: number | null;
    latitude: number | null;
  } | null;
};

type FeedResponse = {
  message?: string;
  posts: FeedApiPost[];
};

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const ESTIMATED_CAPTION_CHARS_PER_LINE = 18;
const ESTIMATED_CARD_BASE_HEIGHT = 280;
const ESTIMATED_TEXT_LINE_HEIGHT = 22;

const estimatePostHeight = (post: FeedPost) => {
  const captionLines = post.text
    ? Math.ceil(post.text.length / ESTIMATED_CAPTION_CHARS_PER_LINE)
    : 0;
  const locationRowHeight = post.locationName || post.coordinates ? 24 : 0;

  return (
    ESTIMATED_CARD_BASE_HEIGHT +
    captionLines * ESTIMATED_TEXT_LINE_HEIGHT +
    locationRowHeight
  );
};

const buildMasonryColumns = (posts: FeedPost[]) => {
  const leftColumn: FeedPost[] = [];
  const rightColumn: FeedPost[] = [];
  let leftHeight = 0;
  let rightHeight = 0;

  posts.forEach((post) => {
    const estimatedHeight = estimatePostHeight(post);

    if (leftHeight <= rightHeight) {
      leftColumn.push(post);
      leftHeight += estimatedHeight;
      return;
    }

    rightColumn.push(post);
    rightHeight += estimatedHeight;
  });

  return { leftColumn, rightColumn };
};

export default function FeedScreen() {
  const pathname = usePathname();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const glowOneAnimation = useRef(new Animated.Value(0)).current;
  const glowTwoAnimation = useRef(new Animated.Value(0)).current;
  const hasLoadedFeed = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestInFlight = useRef(false);
  const skipNextFocusReload = useRef(false);
  const { leftColumn, rightColumn } = buildMasonryColumns(feedPosts);

  useEffect(() => {
    const glowOneLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOneAnimation, {
          toValue: 1,
          duration: 4200,
          useNativeDriver: true,
        }),
        Animated.timing(glowOneAnimation, {
          toValue: 0,
          duration: 4200,
          useNativeDriver: true,
        }),
      ]),
    );

    const glowTwoLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowTwoAnimation, {
          toValue: 1,
          duration: 5200,
          useNativeDriver: true,
        }),
        Animated.timing(glowTwoAnimation, {
          toValue: 0,
          duration: 5200,
          useNativeDriver: true,
        }),
      ]),
    );

    glowOneLoop.start();
    glowTwoLoop.start();

    return () => {
      glowOneLoop.stop();
      glowTwoLoop.stop();
      glowOneAnimation.stopAnimation();
      glowTwoAnimation.stopAnimation();
    };
  }, [glowOneAnimation, glowTwoAnimation]);

  const glowOneStyle = {
    opacity: glowOneAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
    }),
    transform: [
      {
        translateX: glowOneAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 14],
        }),
      },
      {
        translateY: glowOneAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        scale: glowOneAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
  };

  const glowTwoStyle = {
    opacity: glowTwoAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 0.92],
    }),
    transform: [
      {
        translateX: glowTwoAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        }),
      },
      {
        translateY: glowTwoAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 12],
        }),
      },
      {
        scale: glowTwoAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };

  const loadFeed = useCallback(async ({ showLoading = false }: {
    showLoading?: boolean;
  } = {}) => {
    if (requestInFlight.current) {
      return;
    }

    requestInFlight.current = true;

    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage(null);

    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/posts/feed`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = (await response.json()) as FeedResponse;

      if (!response.ok) {
        setErrorMessage(data?.message || "Could not load the feed.");
        return;
      }

      setFeedPosts(
        data.posts.map((post) => ({
          id: post.postId,
          text: post.text ?? "",
          imageUrl: `${API_ORIGIN}${post.image}`,
          createdAt: post.createdAt,
          locationName: post.locationName ?? null,
          coordinates:
            post.coordinates?.longitude != null &&
            post.coordinates?.latitude != null
              ? {
                  longitude: post.coordinates.longitude,
                  latitude: post.coordinates.latitude,
                }
              : null,
        })),
      );
    } catch (error) {
      console.error("Feed load error:", error);
      setErrorMessage("Could not connect to the server.");
    } finally {
      requestInFlight.current = false;

      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const handleOpenPost = useCallback((post: FeedPost) => {
    skipNextFocusReload.current = true;

    router.push({
      pathname: "/posts/[postId]",
      params: {
        postId: post.id,
        post: JSON.stringify(post),
      },
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedFeed.current) {
        hasLoadedFeed.current = true;
        void loadFeed({ showLoading: true });
      } else if (skipNextFocusReload.current) {
        skipNextFocusReload.current = false;
      } else {
        void loadFeed();
      }
    }, [loadFeed]),
  );

  useEffect(() => {
    stopPolling();

    if (pathname !== "/feed" || FEED_POLL_INTERVAL_MS <= 0) {
      return;
    }

    pollTimer.current = setInterval(() => {
      void loadFeed();
    }, FEED_POLL_INTERVAL_MS);

    return stopPolling;
  }, [loadFeed, pathname, stopPolling]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading the feed...</Text>
        </View>
      ) : errorMessage ? (
        <View style={[styles.listContent, styles.emptyListContent]}>
          <View style={styles.emptyState}>
            <Animated.View
              pointerEvents="none"
              style={[styles.emptyGlowOne, glowOneStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.emptyGlowTwo, glowTwoStyle]}
            />

            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color="#F3D0D0"
                />
              </View>

              <Text style={styles.emptyStateTitle}>Could not load the feed.</Text>
              <Text style={styles.emptyStateText}>{errorMessage}</Text>

              <Pressable
                style={styles.retryButton}
                onPress={() => void loadFeed({ showLoading: true })}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : feedPosts.length === 0 ? (
        <View style={[styles.listContent, styles.emptyListContent]}>
          <View style={styles.emptyState}>
            <Animated.View
              pointerEvents="none"
              style={[styles.emptyGlowOne, glowOneStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.emptyGlowTwo, glowTwoStyle]}
            />

            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="images-outline" size={28} color="#EAEAEA" />
              </View>

              <Text style={styles.emptyStateTitle}>
                Nobody is doing anything right now.
              </Text>
              <Text style={styles.emptyStateText}>
                New posts will appear here as people share what they are doing.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.feedTitle}>The Pulse</Text>

          <View style={styles.masonryGrid}>
            <View style={styles.masonryColumn}>
              {leftColumn.map((post) => (
                <View key={post.id} style={styles.masonryItem}>
                  <PostCard post={post} onPress={handleOpenPost} />
                </View>
              ))}
            </View>

            <View style={styles.masonryColumn}>
              {rightColumn.map((post) => (
                <View key={post.id} style={styles.masonryItem}>
                  <PostCard post={post} onPress={handleOpenPost} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#B5B5B5",
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  feedTitle: {
    color: "#F5F5F5",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 18,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  masonryGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  masonryColumn: {
    flex: 1,
  },
  masonryItem: {
    marginBottom: 16,
  },
  emptyState: {
    position: "relative",
    minHeight: 420,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  emptyGlowOne: {
    position: "absolute",
    top: 56,
    left: -28,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#171717",
  },
  emptyGlowTwo: {
    position: "absolute",
    right: -18,
    bottom: 28,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#101010",
  },
  emptyCard: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#111111",
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    marginBottom: 18,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateText: {
    maxWidth: 260,
    color: "#9B9B9B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
});
