import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView as ScrollViewType,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PostCard, type FeedPost } from "../../components/posts/PostCard";
import { API_BASE_URL, FEED_POLL_INTERVAL_MS } from "../../constants/api";
import { subscribeToEchoChanges } from "../../utils/echoStore";
import { subscribeToReactionChanges } from "../../utils/reactionStore";
import {
  emptyReactionCounts,
  type ReactionCounts,
  type ReactionType,
} from "../../utils/reactionTypes";

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
  echoCount: number;
  hasEchoed: boolean;
  reactionCounts?: Partial<ReactionCounts>;
  userReaction?: ReactionType | null;
};

type FeedResponse = {
  message?: string;
  posts: FeedApiPost[];
};

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const PULL_THRESHOLD = 70;
const SPINNER_AREA_HEIGHT = 56;
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
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const glowOneAnimation = useRef(new Animated.Value(0)).current;
  const glowTwoAnimation = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const spacerHeight = useRef(new Animated.Value(0)).current;
  const feedScrollRef = useRef<ScrollViewType | null>(null);
  const hasLoadedFeed = useRef(false);
  const isFeedRouteActive = useRef(pathname === "/feed");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestInFlight = useRef(false);
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

  const scrollFeedToTop = useCallback(() => {
    feedScrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }, []);

  const loadFeed = useCallback(
    async ({
      showLoading = false,
      showRefreshing = false,
      scrollToTopOnSuccess = false,
    }: {
      showLoading?: boolean;
      showRefreshing?: boolean;
      scrollToTopOnSuccess?: boolean;
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
            echoCount: post.echoCount ?? 0,
            hasEchoed: post.hasEchoed ?? false,
            reactionCounts: {
              ...emptyReactionCounts(),
              ...(post.reactionCounts ?? {}),
            },
            userReaction: post.userReaction ?? null,
          })),
        );

        if (scrollToTopOnSuccess && isFeedRouteActive.current) {
          scrollFeedToTop();
        }

        if (
          showRefreshing &&
          isFeedRouteActive.current &&
          FEED_POLL_INTERVAL_MS > 0
        ) {
          if (pollTimer.current !== null) {
            clearInterval(pollTimer.current);
          }

          pollTimer.current = setInterval(() => {
            void loadFeed({ scrollToTopOnSuccess: true });
          }, FEED_POLL_INTERVAL_MS);
        }
      } catch (error) {
        console.error("Feed load error:", error);
        setErrorMessage("Could not connect to the server.");
      } finally {
        requestInFlight.current = false;

        if (showLoading) {
          setLoading(false);
        }

        if (showRefreshing) {
          setRefreshing(false);
        }
      }
    },
    [scrollFeedToTop],
  );

  const handleOpenPost = useCallback((post: FeedPost) => {
    router.push({
      pathname: "/posts/[postId]" as any,
      params: { postId: post.id, post: JSON.stringify(post) },
    });
  }, []);

  const handleEchoStateChange = useCallback(
    (postId: string, hasEchoed: boolean, echoCount: number) => {
      setFeedPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hasEchoed, echoCount } : p)),
      );
    },
    [],
  );

  const handleReactionStateChange = useCallback(
    (
      postId: string,
      userReaction: ReactionType | null,
      reactionCounts: ReactionCounts,
    ) => {
      setFeedPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, userReaction, reactionCounts } : p,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    return subscribeToEchoChanges(({ postId, hasEchoed, echoCount }) => {
      handleEchoStateChange(postId, hasEchoed, echoCount);
    });
  }, [handleEchoStateChange]);

  useEffect(() => {
    return subscribeToReactionChanges(
      ({ postId, userReaction, reactionCounts }) => {
        handleReactionStateChange(postId, userReaction, reactionCounts);
      },
    );
  }, [handleReactionStateChange]);

  const handleEchoToggle = useCallback(
    async (postId: string, currentlyEchoed: boolean) => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        throw new Error("Missing auth token");
      }

      const method = currentlyEchoed ? "DELETE" : "POST";
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/echo`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        router.replace("/login");
        throw new Error("Unauthorized");
      }

      const data = (await response.json()) as { echoCount?: number };

      if (!response.ok) {
        throw new Error("Echo request failed");
      }

      if (typeof data.echoCount !== "number") {
        throw new Error("Echo response missing count");
      }

      return data.echoCount;
    },
    [],
  );

  const handleReactionChange = useCallback(
    async (postId: string, nextReaction: ReactionType | null) => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        throw new Error("Missing auth token");
      }

      const isRemoval = nextReaction === null;
      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/reaction`,
        {
          method: isRemoval ? "DELETE" : "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: isRemoval ? undefined : JSON.stringify({ type: nextReaction }),
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        throw new Error("Unauthorized");
      }

      const data = (await response.json()) as {
        userReaction?: ReactionType | null;
        reactionCounts?: Partial<ReactionCounts>;
      };

      if (!response.ok) {
        throw new Error("Reaction request failed");
      }

      return {
        userReaction: data.userReaction ?? null,
        reactionCounts: {
          ...emptyReactionCounts(),
          ...(data.reactionCounts ?? {}),
        },
      };
    },
    [],
  );

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    isFeedRouteActive.current = pathname === "/feed";
  }, [pathname]);

  useEffect(() => {
    Animated.spring(spacerHeight, {
      toValue: refreshing ? SPINNER_AREA_HEIGHT : 0,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  }, [refreshing, spacerHeight]);

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (
        !requestInFlight.current &&
        event.nativeEvent.contentOffset.y <= -PULL_THRESHOLD
      ) {
        void loadFeed({ showRefreshing: true });
      }
    },
    [loadFeed],
  );

  const pullOpacity = scrollY.interpolate({
    inputRange: [-PULL_THRESHOLD, -16, 0],
    outputRange: [1, 0.2, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (hasLoadedFeed.current) {
      return;
    }

    hasLoadedFeed.current = true;
    void loadFeed({ showLoading: true });
  }, [loadFeed]);

  useEffect(() => {
    stopPolling();

    if (pathname !== "/feed" || FEED_POLL_INTERVAL_MS <= 0) {
      return;
    }

    pollTimer.current = setInterval(() => {
      void loadFeed({ scrollToTopOnSuccess: true });
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

              <Text style={styles.emptyStateTitle}>
                Could not load the feed.
              </Text>
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
        <View style={styles.scrollWrap}>
          <View pointerEvents="none" style={styles.spinnerOverlay}>
            <Animated.View style={{ opacity: refreshing ? 1 : pullOpacity }}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </Animated.View>
          </View>
          <Animated.ScrollView
            ref={feedScrollRef}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true },
            )}
            onScrollEndDrag={handleScrollEndDrag}
          >
            <Animated.View style={{ height: spacerHeight }} />
            <Text style={styles.feedTitle}>The Pulse</Text>

            <View style={styles.masonryGrid}>
              <View style={styles.masonryColumn}>
                {leftColumn.map((post) => (
                  <View key={post.id} style={styles.masonryItem}>
                    <PostCard
                      post={post}
                      onPress={handleOpenPost}
                      onEchoToggle={handleEchoToggle}
                      onEchoStateChange={handleEchoStateChange}
                      onReactionChange={handleReactionChange}
                      onReactionStateChange={handleReactionStateChange}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.masonryColumn}>
                {rightColumn.map((post) => (
                  <View key={post.id} style={styles.masonryItem}>
                    <PostCard
                      post={post}
                      onPress={handleOpenPost}
                      onEchoToggle={handleEchoToggle}
                      onEchoStateChange={handleEchoStateChange}
                      onReactionChange={handleReactionChange}
                      onReactionStateChange={handleReactionStateChange}
                    />
                  </View>
                ))}
              </View>
            </View>
          </Animated.ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollWrap: {
    flex: 1,
  },
  spinnerOverlay: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 0,
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
