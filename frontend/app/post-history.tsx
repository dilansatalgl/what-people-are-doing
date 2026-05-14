import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PostCard, type FeedPost } from "../components/posts/PostCard";
import { API_BASE_URL } from "../constants/api";
import { clearAuthSession, getAuthToken } from "../utils/authStorage";
import {
  emptyReactionCounts,
  type ReactionCounts,
  type ReactionType,
} from "../utils/reactionTypes";

type HistoryApiPost = {
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
  reactionCounts?: Partial<ReactionCounts>;
  userReaction?: ReactionType | null;
};

type HistoryResponse = {
  message?: string;
  posts: HistoryApiPost[];
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

export default function PostHistoryScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { leftColumn, rightColumn } = buildMasonryColumns(posts);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = await getAuthToken();
      if (!token) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/posts/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      const data = (await response.json()) as HistoryResponse;

      if (!response.ok) {
        setErrorMessage(data.message || "Could not load post history.");
        return;
      }

      const nextPosts = data.posts.map((post) => ({
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
        hasEchoed: false,
        reactionCounts: {
          ...emptyReactionCounts(),
          ...(post.reactionCounts ?? {}),
        },
        userReaction: post.userReaction ?? null,
      }));

      setPosts(nextPosts);
    } catch (error) {
      console.error("Post history load error:", error);
      setErrorMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Post History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading post history...</Text>
        </View>
      ) : errorMessage ? (
        <View style={[styles.listContent, styles.emptyListContent]}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color="#F3D0D0" />
            </View>
            <Text style={styles.emptyStateTitle}>Could not load history.</Text>
            <Text style={styles.emptyStateText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void loadHistory()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : posts.length === 0 ? (
        <View style={[styles.listContent, styles.emptyListContent]}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="images-outline" size={28} color="#EAEAEA" />
            </View>
            <Text style={styles.emptyStateTitle}>No posts yet.</Text>
            <Text style={styles.emptyStateText}>
              Your posts will appear here after you share them.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.masonryGrid}>
            <View style={styles.masonryColumn}>
              {leftColumn.map((post) => (
                <View key={post.id} style={styles.masonryItem}>
                  <PostCard post={post} />
                </View>
              ))}
            </View>

            <View style={styles.masonryColumn}>
              {rightColumn.map((post) => (
                <View key={post.id} style={styles.masonryItem}>
                  <PostCard post={post} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: "#F5F5F5",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
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
