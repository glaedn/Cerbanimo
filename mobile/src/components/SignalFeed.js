import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme";

export function SignalFeed({ signals = [], onSignalPress }) {
  if (signals.length === 0) return null;

  return (
    <View style={styles.container}>
      {signals.map((signal) => (
        <Pressable
          key={signal.id}
          onPress={() => onSignalPress?.(signal)}
          style={({ pressed }) => [
            styles.signalItem,
            pressed && styles.pressed
          ]}
        >
          <View style={[styles.indicator, { backgroundColor: getSignalColor(signal.priority) }]} />
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.type}>{signal.type.toUpperCase()}</Text>
              <Text style={styles.time}>{new Date(signal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>{signal.message}</Text>
            {signal.distance && (
              <Text style={styles.distance}>{signal.distance}m away</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

function getSignalColor(priority) {
  if (priority >= 4) return colors.rose;
  if (priority >= 2) return colors.amber;
  return colors.cyan;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  signalItem: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.md,
    overflow: "hidden"
  },
  indicator: {
    width: 6,
    height: "100%"
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: 2
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  type: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  time: {
    color: colors.muted,
    fontSize: 11
  },
  message: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18
  },
  distance: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  pressed: {
    opacity: 0.8,
    backgroundColor: colors.panelSoft
  }
});
