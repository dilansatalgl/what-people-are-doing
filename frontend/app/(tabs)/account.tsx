import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ManageAccountActions } from "../../components/account/ManageAccountActions";
import { API_BASE_URL } from "../../constants/api";
import { clearAuthSession, getAuthToken } from "../../utils/authStorage";

type UserProfile = {
  username: string;
  email: string;
};

export default function AccountScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await getAuthToken();

      if (!token) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        return;
      }

      Alert.alert("Error", data.message || "Failed to load profile.");
    } catch (error) {
      console.error("Profile load error:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>WHAT PEOPLE ARE DOING</Text>
          <Text style={styles.heading}>Account</Text>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          ) : (
            <>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {profile?.username?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Username</Text>
                <Text style={styles.fieldValue}>
                  {profile?.username ? `@${profile.username}` : "Unavailable"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>
                  {profile?.email || "Unavailable"}
                </Text>
              </View>
            </>
          )}
        </View>

        <ManageAccountActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: "#000000",
  },
  header: {
    marginBottom: 12,
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
  centered: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
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
});
