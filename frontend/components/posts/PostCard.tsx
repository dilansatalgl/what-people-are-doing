import { useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
};

type PostCardProps = {
  post: FeedPost;
  onPress?: (post: FeedPost) => void;
  onEchoToggle?: (postId: string, currentlyEchoed: boolean) => Promise<void>;
  onEchoStateChange?: (postId: string, hasEchoed: boolean, echoCount: number) => void;
};

const formatCoordinates = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

export function PostCard({ post, onPress, onEchoToggle, onEchoStateChange }: PostCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [echoCount, setEchoCount] = useState(post.echoCount);
  const [hasEchoed, setHasEchoed] = useState(post.hasEchoed);
  const [echoLoading, setEchoLoading] = useState(false);
  const pressAnimation = useRef(new Animated.Value(0)).current;
  const locationLabel =
    post.locationName ||
    (post.coordinates ? formatCoordinates(post.coordinates) : null);
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
    if (echoLoading || !onEchoToggle) return;

    const prevEchoed = hasEchoed;
    const prevCount = echoCount;
    const newHasEchoed = !prevEchoed;
    const newCount = prevCount + (prevEchoed ? -1 : 1);

    setHasEchoed(newHasEchoed);
    setEchoCount(newCount);
    setEchoLoading(true);
    onEchoStateChange?.(post.id, newHasEchoed, newCount);

    try {
      await onEchoToggle(post.id, prevEchoed);
    } catch {
      setHasEchoed(prevEchoed);
      setEchoCount(prevCount);
      onEchoStateChange?.(post.id, prevEchoed, prevCount);
    } finally {
      setEchoLoading(false);
    }
  };

  return (
    <Pressable
      onPress={() => onPress?.(post)}
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
            {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}

            <View style={styles.metaRow}>
              {locationLabel ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#8F8F8F" />
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

              <Pressable
                style={styles.echoButton}
                onPress={handleEchoPress}
                hitSlop={8}
              >
                <Ionicons
                  name={hasEchoed ? "radio" : "radio-outline"}
                  size={15}
                  color={hasEchoed ? "#FFFFFF" : "#4A4A4A"}
                />
                {echoCount > 0 ? (
                  <Text style={[styles.echoCount, hasEchoed && styles.echoCountActive]}>
                    {echoCount}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
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
