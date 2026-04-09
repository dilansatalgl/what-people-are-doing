import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#6E6E6E",
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: IoniconName = "ellipse-outline";

          if (route.name === "feed") {
            iconName = focused ? "compass" : "compass-outline";
          } else if (route.name === "post") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "heatmap") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "account") {
            iconName = focused ? "person-circle" : "person-circle-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: "Heatmap",
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "Post",
          tabBarButton: ({ children, style }) => (
            <TouchableOpacity
              style={style}
              onPress={() => router.push("/create-post")}
            >
              {children}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "#000000",
  },
  tabBar: {
    backgroundColor: "#111111",
    borderTopColor: "#262626",
    height: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  tabBarItem: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  tabBarIcon: {
    marginTop: 0,
  },
});
