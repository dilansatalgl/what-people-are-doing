import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  clearAuthSession,
  getAuthToken,
} from "../../utils/authStorage";
import { API_BASE_URL } from "../../constants/api";
import { getDeleteAccountOutcome } from "../../utils/manageAccount";

export function ManageAccountActions() {
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const clearSessionAndRedirect = async () => {
    await clearAuthSession();
    router.replace("/login");
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await clearSessionAndRedirect();
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Could not log out right now.");
    } finally {
      setLogoutLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const token = await getAuthToken();

      if (!token) {
        await clearSessionAndRedirect();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      const outcome = getDeleteAccountOutcome(response.status);

      if (outcome === "deleted") {
        await clearSessionAndRedirect();
        return;
      }

      if (outcome === "session-ended") {
        await clearSessionAndRedirect();
        Alert.alert("Session ended", data.message || "Please log in again.");
        return;
      }

      Alert.alert(
        "Error",
        data.message || "Could not delete your account right now.",
      );
    } catch (error) {
      console.error("Delete account error:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account and related data from the system.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteAccount();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.button, logoutLoading && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={logoutLoading || deleteLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.buttonText}>Log Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Delete Account</Text>
        <Text style={styles.dangerText}>
          This permanently removes your account and related data from the
          system.
        </Text>

        <TouchableOpacity
          style={[styles.dangerButton, deleteLoading && styles.buttonDisabled]}
          onPress={handleDeletePress}
          disabled={deleteLoading || logoutLoading}
        >
          {deleteLoading ? (
            <ActivityIndicator color="#F87171" />
          ) : (
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 18,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 18,
  },
  label: {
    color: "#F5F5F5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  dangerText: {
    color: "#8F8F8F",
    fontSize: 12,
    lineHeight: 18,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#7F1D1D",
    backgroundColor: "#1B0B0B",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },
  dangerButtonText: {
    color: "#F87171",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
