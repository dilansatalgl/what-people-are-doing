import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/api";
export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanedUsername = username.trim().toLowerCase();

    if (!cleanedUsername || !password) {
      Alert.alert("Error", "Username and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanedUsername,
          password,
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));

        Alert.alert("Success", data.message || "Login successful.");
        router.replace("/(tabs)/feed");
        return;
      }

      if (response.status === 400) {
        Alert.alert(
          "Error",
          data.message || "Username and password are required.",
        );
        return;
      }

      if (response.status === 401 || response.status === 404) {
        Alert.alert("Error", "Username or password incorrect");
        return;
      }

      if (response.status === 500) {
        Alert.alert("Error", data.message || "Server error during login.");
        return;
      }

      Alert.alert(
        "Error",
        data.message || "Something went wrong during login.",
      );
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topSection}>
            <Text style={styles.brand}>WHAT PEOPLE ARE DOING</Text>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>
              Log in to continue sharing updates with your community.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              editable={!loading}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/signup")}
              disabled={loading}
            >
              <Text style={styles.footerText}>
                Don’t have an account?{" "}
                <Text style={styles.footerLink}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: "#000000",
  },
  topSection: {
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
    marginBottom: 10,
  },
  subheading: {
    color: "#A3A3A3",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#262626",
  },
  label: {
    color: "#F5F5F5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#303030",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: "#FFFFFF",
  },
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 26,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  footerText: {
    color: "#A3A3A3",
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
  },
  footerLink: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
