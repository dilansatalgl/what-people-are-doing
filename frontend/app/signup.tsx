import React, { useRef, useState } from "react";
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
  Animated,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 4,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -4,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const clearErrors = () => {
    setUsernameError("");
    setEmailError("");
  };

  const handleSignup = async () => {
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedUsername = username.trim().toLowerCase();

    clearErrors();

    if (!cleanedEmail || !cleanedUsername || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanedEmail,
          username: cleanedUsername,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));

        Alert.alert("Success", data.message || "User created successfully.");
        router.replace("/");
        return;
      }

      if (response.status === 400) {
        Alert.alert("Error", data.message || "Invalid input.");
        return;
      }

      if (response.status === 409) {
        if (data.message === "Username is already taken.") {
          setUsernameError(data.message);
          shakeError();
          return;
        }

        if (data.message === "Email is already in use.") {
          setEmailError(data.message);
          shakeError();
          return;
        }

        Alert.alert(
          "Error",
          data.message || "Username or email already exists."
        );
        return;
      }

      if (response.status === 500) {
        Alert.alert("Error", data.message || "Server error during signup.");
        return;
      }

      Alert.alert(
        "Error",
        data.message || "Something went wrong during signup."
      );
    } catch (error) {
      console.error("Signup error:", error);
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
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subheading}>
              Start sharing moments, activities, and updates with your
              community.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#7A7A7A"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
              editable={!loading}
            />

            {emailError ? (
              <Animated.Text
                style={[
                  styles.errorText,
                  { transform: [{ translateX: shakeAnimation }] },
                ]}
              >
                {emailError}
              </Animated.Text>
            ) : null}

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) setUsernameError("");
              }}
              editable={!loading}
            />

            {usernameError ? (
              <Animated.Text
                style={[
                  styles.errorText,
                  { transform: [{ translateX: shakeAnimation }] },
                ]}
              >
                {usernameError}
              </Animated.Text>
            ) : null}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#7A7A7A"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <Text style={styles.passwordHint}>
              Must be at least 8 characters and include 1 uppercase letter, 1
              number, and 1 special character.
            </Text>

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#7A7A7A"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginLink}>Log in</Text>
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
    color: "#BFBFBF",
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
    color: "#9A9A9A",
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
  errorText: {
    color: "#FF6B6B",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "600",
  },
  passwordHint: {
    color: "#8F8F8F",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
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
  loginText: {
    color: "#A3A3A3",
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
  },
  loginLink: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
