import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { config } from "../config";
import { colors, radii, spacing } from "../theme";

function avatarUri(profile, authUser) {
  const picture = profile?.profile_picture || authUser?.picture;
  if (!picture) return "";
  if (/^(https?:|data:|file:)/i.test(picture)) return picture;
  const base = config.backendUrl.replace(/\/$/, "");
  const path = picture.startsWith("/") ? picture : `/${picture}`;
  return `${base}${path}`;
}

export function TopControls({ profile, authUser, unreadCount = 0, onProfile, onNotifications }) {
  const uri = avatarUri(profile, authUser);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open notifications"
        onPress={onNotifications}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.cyan} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.min(unreadCount, 99)}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={onProfile}
        style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle-outline" size={30} color={colors.cyan} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 30,
    flexDirection: "row",
    gap: spacing.sm
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(5, 16, 34, 0.86)",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(5, 16, 34, 0.86)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  badge: {
    position: "absolute",
    right: -4,
    top: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.96 }]
  }
});
