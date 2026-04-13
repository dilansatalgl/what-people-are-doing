import React from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ManageAccountActions } from "../../components/account/ManageAccountActions";

export default function AccountScreen() {
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
});
