import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ReactionPicker } from "./ReactionPicker";
import {
  REACTION_EMOJI,
  emptyReactionCounts,
  topReaction,
  totalReactionCount,
  type ReactionCounts,
  type ReactionType,
} from "../../utils/reactionTypes";

type FeedCoordinates = {
  longitude: number;
  latitude: number;
};

export type FeedPost = {
  id: string;
  text: string;
  imageUrl: string;
  locationName: string | null;
  coordinates: FeedCoordinates | null;
  createdAt: string;
  echoCount: number;
  hasEchoed: boolean;
  reactionCounts: ReactionCounts;
  userReaction: ReactionType | null;
};

type ReactionResult = {
  userReaction: ReactionType | null;
  reactionCounts: ReactionCounts;
};

type PostCardProps = {
  post: FeedPost;
  onPress?: (post: FeedPost) => void;
  onEchoToggle?: (postId: string, currentlyEchoed: boolean) => Promise<number>;
  onEchoStateChange?: (
    postId: string,
    hasEchoed: boolean,
    echoCount: number,
  ) => void;
  onReactionChange?: (
    postId: string,
    nextReaction: ReactionType | null,
  ) => Promise<ReactionResult>;
  onReactionStateChange?: (
    postId: string,
    userReaction: ReactionType | null,
    reactionCounts: ReactionCounts,
  ) => void;
};

const formatCoordinates = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

export function PostCard({
  post,
  onPress,
  onEchoToggle,
  onEchoStateChange,
  onReactionChange,
  onReactionStateChange,
}: PostCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [echoCount, setEchoCount] = useState(post.echoCount);
  const [hasEchoed, setHasEchoed] = useState(post.hasEchoed);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>(
    post.reactionCounts ?? emptyReactionCounts(),
  );
  const [userReaction, setUserReaction] = useState<ReactionType | null>(
    post.userReaction ?? null,
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const echoInFlight = useRef(false);
  const reactionInFlight = useRef(false);
  const pressAnimation = useRef(new Animated.Value(0)).current;
  const locationLabel =
    post.locationName ||
    (post.coordinates ? formatCoordinates(post.coordinates) : null);

  useEffect(() => {
    setEchoCount(post.echoCount);
    setHasEchoed(post.hasEchoed);
    setReactionCounts(post.reactionCounts ?? emptyReactionCounts());
    setUserReaction(post.userReaction ?? null);
  }, [
    post.echoCount,
    post.hasEchoed,
    post.reactionCounts,
    post.userReaction,
  ]);

  const animatedCardStyle = {
    transform: [
      {
        scale: pressAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.04],
        }),
      },
    ],
  };

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(pressAnimation, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnimation, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start(({ finished }) => {
      if (finished) {
        setIsPressed(false);
      }
    });
  };

  const handleEchoPress = async () => {
    if (echoInFlight.current || !onEchoToggle) return;
    echoInFlight.current = true;

    const prevEchoed = hasEchoed;
    const prevCount = echoCount;
    const newHasEchoed = !prevEchoed;
    const newCount = Math.max(0, prevCount + (prevEchoed ? -1 : 1));

    setHasEchoed(newHasEchoed);
    setEchoCount(newCount);
    onEchoStateChange?.(post.id, newHasEchoed, newCount);

    try {
      const serverEchoCount = await onEchoToggle(post.id, prevEchoed);
      setEchoCount(serverEchoCount);
      onEchoStateChange?.(post.id, newHasEchoed, serverEchoCount);
    } catch {
      setHasEchoed(prevEchoed);
      setEchoCount(prevCount);
      onEchoStateChange?.(post.id, prevEchoed, prevCount);
    } finally {
      setTimeout(() => {
        echoInFlight.current = false;
      }, 400);
    }
  };

  const applyOptimisticReaction = (next: ReactionType | null) => {
    const draft = { ...reactionCounts };
    if (userReaction && draft[userReaction] > 0) {
      draft[userReaction] -= 1;
    }
    if (next) {
      draft[next] = (draft[next] ?? 0) + 1;
    }
    return draft;
  };

  const handleReactionSelect = async (nextType: ReactionType) => {
    setPickerVisible(false);

    if (!onReactionChange || reactionInFlight.current) return;
    reactionInFlight.current = true;

    const prevReaction = userReaction;
    const prevCounts = reactionCounts;
    const isSame = prevReaction === nextType;
    const nextReaction: ReactionType | null = isSame ? null : nextType;
    const optimisticCounts = applyOptimisticReaction(nextReaction);

    setUserReaction(nextReaction);
    setReactionCounts(optimisticCounts);
    onReactionStateChange?.(post.id, nextReaction, optimisticCounts);

    try {
      const result = await onReactionChange(post.id, nextReaction);
      setUserReaction(result.userReaction);
      setReactionCounts(result.reactionCounts);
      onReactionStateChange?.(
        post.id,
        result.userReaction,
        result.reactionCounts,
      );
    } catch {
      setUserReaction(prevReaction);
      setReactionCounts(prevCounts);
      onReactionStateChange?.(post.id, prevReaction, prevCounts);
    } finally {
      setTimeout(() => {
        reactionInFlight.current = false;
      }, 300);
    }
  };

  const handleLongPress = () => {
    if (!onReactionChange) return;
    setPickerVisible(true);
  };

  const total = totalReactionCount(reactionCounts);
  const top = topReaction(reactionCounts);
  const summaryEmoji = userReaction
    ? REACTION_EMOJI[userReaction]
    : top
      ? REACTION_EMOJI[top.type]
      : null;

  return (
    <>
      <Pressable
        onPress={() => onPress?.(post)}
        onLongPress={handleLongPress}
        delayLongPress={280}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.cardWrap,
            isPressed && styles.cardWrapRaised,
            animatedCardStyle,
          ]}
        >
          <View style={styles.card}>
            <Image source={{ uri: post.imageUrl }} style={styles.image} />

            <View style={styles.body}>
              {post.text ? (
                <Text style={styles.postText}>{post.text}</Text>
              ) : null}

              <View style={styles.metaRow}>
                {locationLabel ? (
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color="#8F8F8F"
                    />
                    <Text
                      style={styles.locationText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {locationLabel}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.locationRow} />
                )}

                {summaryEmoji ? (
                  <Pressable
                    style={[
                      styles.reactionSummary,
                      userReaction && styles.reactionSummaryActive,
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();
                      setPickerVisible(true);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.reactionSummaryEmoji}>
                      {summaryEmoji}
                    </Text>
                    {total > 0 ? (
                      <Text
                        style={[
                          styles.reactionSummaryCount,
                          userReaction && styles.reactionSummaryCountActive,
                        ]}
                      >
                        {total}
                      </Text>
                    ) : null}
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.reactionAddButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      setPickerVisible(true);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="happy-outline"
                      size={15}
                      color="#8F8F8F"
                    />
                  </Pressable>
                )}

                <Pressable
                  style={styles.echoButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleEchoPress();
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={hasEchoed ? "radio" : "radio-outline"}
                    size={15}
                    color={hasEchoed ? "#FFFFFF" : "#4A4A4A"}
                  />
                  {echoCount > 0 ? (
                    <Text
                      style={[
                        styles.echoCount,
                        hasEchoed && styles.echoCountActive,
                      ]}
                    >
                      {echoCount}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <ReactionPicker
        visible={pickerVisible}
        imageUrl={post.imageUrl}
        caption={post.text}
        currentReaction={userReaction}
        onSelect={handleReactionSelect}
        onDismiss={() => setPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: "relative",
  },
  cardWrapRaised: {
    zIndex: 10,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#232323",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#161616",
  },
  body: {
    padding: 16,
    gap: 10,
  },
  postText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  locationText: {
    flex: 1,
    color: "#9C9C9C",
    fontSize: 12,
    lineHeight: 16,
  },
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1A1A1A",
    marginRight: 8,
  },
  reactionSummaryActive: {
    backgroundColor: "#2A2A2A",
  },
  reactionSummaryEmoji: {
    fontSize: 14,
    lineHeight: 16,
  },
  reactionSummaryCount: {
    color: "#9C9C9C",
    fontSize: 12,
    lineHeight: 16,
  },
  reactionSummaryCountActive: {
    color: "#FFFFFF",
  },
  reactionAddButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 6,
  },
  echoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 8,
  },
  echoCount: {
    color: "#4A4A4A",
    fontSize: 12,
    lineHeight: 16,
  },
  echoCountActive: {
    color: "#FFFFFF",
  },
});
