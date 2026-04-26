import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FeedPost } from "../../components/posts/PostCard";
import { ReactionPicker } from "../../components/posts/ReactionPicker";
import { API_BASE_URL } from "../../constants/api";
import { publishEchoChange } from "../../utils/echoStore";
import { publishReactionChange } from "../../utils/reactionStore";
import {
  REACTION_EMOJI,
  REACTION_TYPES,
  emptyReactionCounts,
  topReaction,
  totalReactionCount,
  type ReactionCounts,
  type ReactionType,
} from "../../utils/reactionTypes";

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

  const [echoCount, setEchoCount] = useState(post?.echoCount ?? 0);
  const [hasEchoed, setHasEchoed] = useState(post?.hasEchoed ?? false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>(
    post?.reactionCounts ?? emptyReactionCounts(),
  );
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    post?.userReaction ?? null,
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const echoInFlight = useRef(false);
  const reactionInFlight = useRef(false);
  const hasPendingReaction = useRef(false);
  const pendingReactionTarget = useRef<ReactionType | null>(null);
  const latestReactionRef = useRef<ReactionType | null>(
    post?.userReaction ?? null,
  );
  const latestCountsRef = useRef<ReactionCounts>(
    post?.reactionCounts ?? emptyReactionCounts(),
  );

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

  const handleEchoPress = async () => {
    if (echoInFlight.current) return;
    echoInFlight.current = true;

    const prevEchoed = hasEchoed;
    const prevCount = echoCount;
    const newEchoCount = Math.max(0, prevCount + (prevEchoed ? -1 : 1));

    setHasEchoed(!prevEchoed);
    setEchoCount(newEchoCount);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        throw new Error("Missing auth token");
      }

      const method = prevEchoed ? "DELETE" : "POST";
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/echo`, {
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

      setEchoCount(data.echoCount);
      publishEchoChange({
        postId: post.id,
        hasEchoed: !prevEchoed,
        echoCount: data.echoCount,
      });
    } catch {
      setHasEchoed(prevEchoed);
      setEchoCount(prevCount);
    } finally {
      setTimeout(() => {
        echoInFlight.current = false;
      }, 400);
    }
  };

  const computeOptimisticCounts = (
    from: ReactionCounts,
    current: ReactionType | null,
    next: ReactionType | null,
  ) => {
    const draft = { ...from };
    if (current && draft[current] > 0) {
      draft[current] -= 1;
    }
    if (next) {
      draft[next] = (draft[next] ?? 0) + 1;
    }
    return draft;
  };

  const sendReactionRequest = async (
    target: ReactionType | null,
  ): Promise<{ userReaction: ReactionType | null; reactionCounts: ReactionCounts }> => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      throw new Error("Missing auth token");
    }

    const isRemoval = target === null;
    const response = await fetch(
      `${API_BASE_URL}/posts/${post.id}/reaction`,
      {
        method: isRemoval ? "DELETE" : "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: isRemoval ? undefined : JSON.stringify({ type: target }),
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
  };

  const handleReactionSelect = async (nextType: ReactionType) => {
    setPickerVisible(false);

    const currentReaction = latestReactionRef.current;
    const currentCounts = latestCountsRef.current;
    const target: ReactionType | null =
      currentReaction === nextType ? null : nextType;
    const optimisticCounts = computeOptimisticCounts(
      currentCounts,
      currentReaction,
      target,
    );

    latestReactionRef.current = target;
    latestCountsRef.current = optimisticCounts;
    setUserReaction(target);
    setReactionCounts(optimisticCounts);

    if (reactionInFlight.current) {
      hasPendingReaction.current = true;
      pendingReactionTarget.current = target;
      return;
    }

    reactionInFlight.current = true;
    let toSend: ReactionType | null = target;
    let rollbackReaction: ReactionType | null = currentReaction;
    let rollbackCounts: ReactionCounts = currentCounts;

    while (true) {
      try {
        const result = await sendReactionRequest(toSend);
        rollbackReaction = result.userReaction;
        rollbackCounts = result.reactionCounts;
        if (!hasPendingReaction.current) {
          latestReactionRef.current = result.userReaction;
          latestCountsRef.current = result.reactionCounts;
          setUserReaction(result.userReaction);
          setReactionCounts(result.reactionCounts);
          publishReactionChange({
            postId: post.id,
            userReaction: result.userReaction,
            reactionCounts: result.reactionCounts,
          });
          break;
        }
      } catch {
        latestReactionRef.current = rollbackReaction;
        latestCountsRef.current = rollbackCounts;
        setUserReaction(rollbackReaction);
        setReactionCounts(rollbackCounts);
        hasPendingReaction.current = false;
        break;
      }
      toSend = pendingReactionTarget.current;
      hasPendingReaction.current = false;
    }

    reactionInFlight.current = false;
  };

  const totalReactions = totalReactionCount(reactionCounts);
  const top = topReaction(reactionCounts);
  const summaryEmoji = userReaction
    ? REACTION_EMOJI[userReaction]
    : top
      ? REACTION_EMOJI[top.type]
      : null;

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

            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.reactionSummary,
                  userReaction && styles.reactionSummaryActive,
                ]}
                onPress={() => setPickerVisible(true)}
                onLongPress={() => setPickerVisible(true)}
                hitSlop={8}
              >
                {summaryEmoji ? (
                  <Text style={styles.reactionSummaryEmoji}>
                    {summaryEmoji}
                  </Text>
                ) : (
                  <Ionicons name="happy-outline" size={18} color="#8F8F8F" />
                )}
                <Text
                  style={[
                    styles.reactionSummaryLabel,
                    userReaction && styles.reactionSummaryLabelActive,
                  ]}
                >
                  {totalReactions > 0
                    ? `${totalReactions} react${totalReactions === 1 ? "" : "s"}`
                    : "React"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.echoButton}
                onPress={handleEchoPress}
                hitSlop={8}
              >
                <Ionicons
                  name={hasEchoed ? "radio" : "radio-outline"}
                  size={18}
                  color={hasEchoed ? "#FFFFFF" : "#4A4A4A"}
                />
                <Text
                  style={[
                    styles.echoLabel,
                    hasEchoed && styles.echoLabelActive,
                  ]}
                >
                  {echoCount > 0 ? `${echoCount} ` : ""}Echo
                </Text>
              </Pressable>
            </View>

            <View style={styles.reactionBreakdown}>
              {REACTION_TYPES.map((type) => {
                const count = reactionCounts[type] ?? 0;
                const isActive = userReaction === type;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.reactionBadge,
                      isActive && styles.reactionBadgeActive,
                      count === 0 && !isActive && styles.reactionBadgeEmpty,
                    ]}
                    onPress={() => void handleReactionSelect(type)}
                    hitSlop={4}
                  >
                    <Text style={styles.reactionBadgeEmoji}>
                      {REACTION_EMOJI[type]}
                    </Text>
                    <Text
                      style={[
                        styles.reactionBadgeCount,
                        isActive && styles.reactionBadgeCountActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <ReactionPicker
        visible={pickerVisible}
        imageUrl={post.imageUrl}
        caption={post.text}
        currentReaction={userReaction}
        onSelect={handleReactionSelect}
        onDismiss={() => setPickerVisible(false)}
      />
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
  echoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1A1A1A",
  },
  reactionSummaryActive: {
    backgroundColor: "#2A2A2A",
  },
  reactionSummaryEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  reactionSummaryLabel: {
    color: "#9C9C9C",
    fontSize: 14,
    lineHeight: 20,
  },
  reactionSummaryLabelActive: {
    color: "#FFFFFF",
  },
  reactionBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#242424",
  },
  reactionBadgeActive: {
    backgroundColor: "#2A2A2A",
    borderColor: "#3A3A3A",
  },
  reactionBadgeEmpty: {
    opacity: 0.5,
  },
  reactionBadgeEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  reactionBadgeCount: {
    color: "#9C9C9C",
    fontSize: 12,
    lineHeight: 16,
    minWidth: 10,
    textAlign: "center",
  },
  reactionBadgeCountActive: {
    color: "#FFFFFF",
  },
  echoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  echoLabel: {
    color: "#4A4A4A",
    fontSize: 14,
    lineHeight: 20,
  },
  echoLabelActive: {
    color: "#FFFFFF",
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
