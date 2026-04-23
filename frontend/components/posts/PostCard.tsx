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
};

type PostCardProps = {
  post: FeedPost;
  onPress?: (post: FeedPost) => void;
};

const formatCoordinates = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

export function PostCard({ post, onPress }: PostCardProps) {
  const [isPressed, setIsPressed] = useState(false);
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

            {locationLabel ? (
              <View style={styles.metaRow}>
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
              </View>
            ) : null}
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
});
