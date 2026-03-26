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
} from "react-native";
import { router } from "expo-router";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    Alert.alert("Success", "Login form is ready.");
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
              value={username}
              onChangeText={setUsername}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/signup")}>
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
