import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

type UserProfile = {
  username: string;
  email: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await AsyncStorage.multiRemove(["token", "user"]);
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
      } else {
        Alert.alert("Error", data.message || "Failed to load profile.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    router.replace("/login");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>WHAT PEOPLE ARE DOING</Text>
          <Text style={styles.heading}>Profile</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.fieldValue}>@{profile?.username}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{profile?.email}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 30,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 10,
    fontWeight: "600",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#262626",
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },
  field: {
    paddingVertical: 12,
  },
  fieldLabel: {
    color: "#A3A3A3",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  fieldValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#262626",
  },
  logoutButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#303030",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutText: {
    color: "#FF4444",
    fontSize: 16,
    fontWeight: "700",
  },
});
