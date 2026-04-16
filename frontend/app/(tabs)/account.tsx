import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { ManageAccountActions } from "../../components/account/ManageAccountActions";
import { API_BASE_URL } from "../../constants/api";
import { clearAuthSession, getAuthToken } from "../../utils/authStorage";

type UserProfile = {
  username: string;
  email: string;
};

const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9._]{4,15}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const emailRegex = /^\S+@\S+\.\S+$/;

export default function AccountScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!errorMessage && !successMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage("");
      setSuccessMessage("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [errorMessage, successMessage]);


  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

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
        setUsername(data.user.username || "");
        setEmail(data.user.email || "");
        return;
      }

      setErrorMessage(data.message || "Failed to load profile.");
    } catch (error) {
      console.error("Profile load error:", error);
      setErrorMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

    const handleStartEdit = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setUsername(profile?.username || "");
    setEmail(profile?.email || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setUsername(profile?.username || "");
    setEmail(profile?.email || "");
    setIsEditing(false);
  };

  const validateForm = () => {
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const passwordProvided = currentPassword.length > 0 || newPassword.length > 0 || confirmNewPassword.length > 0;

    if (!trimmedUsername && !trimmedEmail && !passwordProvided) {
      return "Please update at least one field.";
    }

    if (trimmedUsername !== (profile?.username || "")) {
      if (!usernameRegex.test(trimmedUsername)) {
        return "Username must be 4-15 characters, contain only letters, numbers, underscore or dot, and include at least one letter.";
      }
    }

    if (trimmedEmail !== (profile?.email || "")) {
      if (!emailRegex.test(trimmedEmail)) {
        return "Invalid email format.";
      }
    }

    if (passwordProvided) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return "Current password, new password, and confirm new password are all required to change password.";
      }

      if (!passwordRegex.test(newPassword)) {
        return "Password must be at least 8 characters and include at least one uppercase letter, one number, and one special character.";
      }

      if (newPassword !== confirmNewPassword) {
        return "New passwords do not match.";
      }
    }

    const nothingChanged =
      trimmedUsername === (profile?.username || "") &&
      trimmedEmail === (profile?.email || "") &&
      !passwordProvided;

    if (nothingChanged) {
      return "No changes were made.";
    }

    return "";
  };

  const handleSaveChanges = async () => {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      const validationError = validateForm();
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      setSaving(true);

      const token = await getAuthToken();

      if (!token) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      const trimmedUsername = username.trim().toLowerCase();
      const trimmedEmail = email.trim().toLowerCase();

      const body: {
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
        confirmNewPassword?: string;
      } = {};

      if (trimmedUsername !== (profile?.username || "")) {
        body.username = trimmedUsername;
      }

      if (trimmedEmail !== (profile?.email || "")) {
        body.email = trimmedEmail;
      }
      
      if (currentPassword || newPassword || confirmNewPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
        body.confirmNewPassword = confirmNewPassword;
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        await clearAuthSession();
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Failed to update profile.");
        return;
      }

      setProfile(data.user);
      setUsername(data.user.username || "");
      setEmail(data.user.email || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMessage("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      console.error("Update profile error:", error);
      setErrorMessage("Could not connect to the server.");
    } finally {
      setSaving(false);
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

        {!!errorMessage && (
          <View style={styles.messageBoxError}>
            <Text style={styles.messageTextError}>{errorMessage}</Text>
          </View>
        )}

        {!!successMessage && (
          <View style={styles.messageBoxSuccess}>
            <Text style={styles.messageTextSuccess}>{successMessage}</Text>
          </View>
        )}

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

              {!isEditing ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Username</Text>
                    <Text style={styles.fieldValue}>
                      {profile?.username ? `${profile.username}` : "Unavailable"}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <Text style={styles.fieldValue}>
                      {profile?.email || "Unavailable"}
                    </Text>
                  </View>

                  <Pressable style={styles.primaryButton} onPress={handleStartEdit}>
                    <Text style={styles.primaryButtonText}>Edit Profile</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Username</Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter username"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter email"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Current Password</Text>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>New Password</Text>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Leave blank to keep current password"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Confirm New Password</Text>
                    <TextInput
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#737373"
                      style={styles.input}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <Pressable
                    style={[styles.primaryButton, saving && styles.disabledButton]}
                    onPress={handleSaveChanges}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save Changes</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.secondaryButton}
                    onPress={handleCancelEdit}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </View>

        {!isEditing && <ManageAccountActions />}
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
  messageBoxError: {
    backgroundColor: "#2A0F12",
    borderColor: "#7F1D1D",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  messageTextError: {
    color: "#FCA5A5",
    fontSize: 14,
    fontWeight: "500",
  },
  messageBoxSuccess: {
    backgroundColor: "#0F1F17",
    borderColor: "#166534",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  messageTextSuccess: {
    color: "#86EFAC",
    fontSize: 14,
    fontWeight: "500",
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
    marginBottom: 8,
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
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3F3F46",
    backgroundColor: "#111111",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
