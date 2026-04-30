import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  REACTION_EMOJI,
  REACTION_TYPES,
  type ReactionType,
} from "../../utils/reactionTypes";

type ReactionPickerProps = {
  visible: boolean;
  imageUrl: string;
  caption: string;
  currentReaction: ReactionType | null;
  onSelect: (type: ReactionType) => void;
  onDismiss: () => void;
};

export function ReactionPicker({
  visible,
  imageUrl,
  caption,
  currentReaction,
  onSelect,
  onDismiss,
}: ReactionPickerProps) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      appear.setValue(0);
      Animated.spring(appear, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }).start();
    }
  }, [visible, appear]);

  const pickerStyle = {
    opacity: appear,
    transform: [
      {
        translateY: appear.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
      {
        scale: appear.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  const previewStyle = {
    transform: [
      {
        scale: appear.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1.04],
        }),
      },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.pickerRow, pickerStyle]}>
          {REACTION_TYPES.map((type) => {
            const isActive = currentReaction === type;
            return (
              <Pressable
                key={type}
                style={[
                  styles.reactionButton,
                  isActive && styles.reactionButtonActive,
                ]}
                onPress={() => onSelect(type)}
                hitSlop={6}
              >
                <Text style={styles.reactionEmoji}>{REACTION_EMOJI[type]}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        <Animated.View style={[styles.previewCard, previewStyle]}>
          <Image source={{ uri: imageUrl }} style={styles.previewImage} />
          {caption ? (
            <View style={styles.previewBody}>
              <Text style={styles.previewCaption} numberOfLines={3}>
                {caption}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 32,
    backgroundColor: "#1B1B1B",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    marginBottom: 18,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  reactionButtonActive: {
    backgroundColor: "#2E2E2E",
  },
  reactionEmoji: {
    fontSize: 26,
  },
  previewCard: {
    width: "80%",
    maxWidth: 360,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#242424",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#161616",
  },
  previewBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewCaption: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },
});
