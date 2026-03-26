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
} from "react-native";
import { router } from "expo-router";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const takenUsernames = ["admin", "doga", "testuser", "john"];

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

  const handleSignup = () => {
    const cleanedUsername = username.trim().toLowerCase();
    setUsernameError("");

    if (!email || !username || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (cleanedUsername.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (takenUsernames.includes(cleanedUsername)) {
      setUsernameError("This username is already taken.");
      shakeError();
      return;
    }

    Alert.alert("Success", "Signup form is ready.");
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
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="none"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) setUsernameError("");
              }}
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
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#7A7A7A"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/login")}>
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
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 26,
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
