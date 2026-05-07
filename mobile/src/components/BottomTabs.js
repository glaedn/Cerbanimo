import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme";

const tabs = [
  { key: "dashboard", label: "Home", icon: "grid-outline" },
  { key: "tasks", label: "Tasks", icon: "checkmark-done-outline" },
  { key: "projects", label: "Projects", icon: "git-network-outline" },
  { key: "exchange", label: "Exchange", icon: "swap-horizontal-outline" },
  { key: "profile", label: "Profile", icon: "person-circle-outline" }
];

export function BottomTabs({ active, onChange }) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.tab, selected && styles.selected]}
          >
            <Ionicons name={tab.icon} size={20} color={selected ? colors.cyan : colors.muted} />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 70,
    borderRadius: radii.md,
    backgroundColor: "rgba(11, 24, 37, 0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    flexDirection: "row",
    padding: spacing.xs
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: radii.sm
  },
  selected: {
    backgroundColor: "rgba(66, 217, 214, 0.12)"
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  selectedLabel: {
    color: colors.text
  }
});
