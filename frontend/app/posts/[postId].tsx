import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPost } from "../../components/posts/PostCard";

const getStringParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" ? value : null;
};

const parsePost = (value: string | string[] | undefined): FeedPost | null => {
  const rawValue = getStringParam(value);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    return parsedValue as FeedPost;
  } catch {
    return null;
  }
};

const formatCoordinates = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

const formatPostTime = (createdAt: string) => {
  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  return createdDate.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ post?: string | string[] }>();
  const post = parsePost(params.post);

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.missingState}>
          <Text style={styles.missingTitle}>Post unavailable</Text>
          <Text style={styles.missingText}>
            We could not load this post from the current feed snapshot.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const locationLabel =
    post.locationName ||
    (post.coordinates ? formatCoordinates(post.coordinates) : null);
  const timeLabel = formatPostTime(post.createdAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#F5F5F5" />
        </Pressable>

        <Text style={styles.headerTitle}>Post</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {timeLabel ? (
          <View style={styles.timeRow}>
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>{timeLabel}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Image source={{ uri: post.imageUrl }} style={styles.image} />

          <View style={styles.body}>
            {post.text ? <Text style={styles.caption}>{post.text}</Text> : null}

            {locationLabel ? (
              <View style={styles.locationCard}>
                <Ionicons name="location-outline" size={16} color="#B8B8B8" />
                <Text style={styles.locationText}>{locationLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#252525",
  },
  headerTitle: {
    color: "#F5F5F5",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    padding: 16,
    paddingTop: 12,
    gap: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  timeBadge: {
    borderRadius: 999,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeText: {
    color: "#A7A7A7",
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#242424",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#161616",
  },
  body: {
    padding: 20,
    gap: 16,
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 28,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationText: {
    flex: 1,
    color: "#B8B8B8",
    fontSize: 14,
    lineHeight: 20,
  },
  missingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  missingTitle: {
    color: "#F5F5F5",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  missingText: {
    color: "#9B9B9B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
});
