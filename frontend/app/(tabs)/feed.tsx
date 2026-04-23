import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { PostCard, type FeedPost } from "../../components/posts/PostCard";
import { API_BASE_URL } from "../../constants/api";

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
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { leftColumn, rightColumn } = buildMasonryColumns(feedPosts);

  const loadFeed = useCallback(async () => {
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenPost = useCallback((post: FeedPost) => {
    router.push({
      pathname: "/posts/[postId]",
      params: {
        postId: post.id,
        post: JSON.stringify(post),
      },
    });
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading the feed...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {feedPosts.length > 0 ? (
            <Text style={styles.feedTitle}>The Pulse</Text>
          ) : null}

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
});
