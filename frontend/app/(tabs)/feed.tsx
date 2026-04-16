import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

type ActivePost = {
  _id: string;
  user: string;
  text?: string;
  image: string;
  location?: { name?: string };
  expiresAt: string;
};

export default function FeedScreen() {
  const [activePost, setActivePost] = useState<ActivePost | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("activePost").then((raw) => {
        if (!raw) {
          setActivePost(null);
          return;
        }
        try {
          const post: ActivePost = JSON.parse(raw);
          if (new Date(post.expiresAt) > new Date()) {
            setActivePost(post);
          } else {
            AsyncStorage.removeItem("activePost");
            setActivePost(null);
          }
        } catch {
          setActivePost(null);
        }
      });
    }, []),
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete your post? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDelete },
      ],
    );
  };

  const confirmDelete = async () => {
    if (!activePost) return;
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/posts/${activePost._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        await AsyncStorage.removeItem("activePost");
        setActivePost(null);
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        Alert.alert(
          "Error",
          data.message || "You can only delete your own post.",
        );
        return;
      }

      if (response.status === 404) {
        await AsyncStorage.removeItem("activePost");
        setActivePost(null);
        return;
      }

      Alert.alert("Error", "Something went wrong. Please try again.");
    } catch {
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {activePost && (
        <View style={styles.postCard}>
          <Image
            source={{
              uri: `${API_BASE_URL.replace("/api", "")}${activePost.image}`,
            }}
            style={styles.postImage}
          />
          <View style={styles.postBody}>
            {activePost.text ? (
              <Text style={styles.postText}>{activePost.text}</Text>
            ) : null}
            {activePost.location?.name ? (
              <Text style={styles.postLocation}>
                {activePost.location.name}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.deleteBtnText}>Delete Post</Text>
              )}
            </TouchableOpacity>
          </View>
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
  postCard: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#262626",
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#1A1A1A",
  },
  postBody: {
    padding: 14,
    gap: 6,
  },
  postText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
  },
  postLocation: {
    color: "#888888",
    fontSize: 13,
  },
  deleteBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5C1A1A",
    backgroundColor: "#2A0A0A",
    minWidth: 40,
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
});
