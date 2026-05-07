import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, spacing } from "../theme";

export function Screen({ children, refreshing, onRefresh }) {
  return (
    <LinearGradient colors={[colors.bg, "#0b1825", "#101a2a"]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {children}
      </ScrollView>
    </LinearGradient>
  );
}

export function Header({ title, subtitle, right }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>Cerbanimo</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Panel({ children, style }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({ children, action }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Pill({ children, tone = "cyan" }) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}`]]}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

export function IconButton({ icon, label, onPress, tone = "cyan", disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconButton,
        styles[`button_${tone}`],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.white} />
      <Text style={styles.iconButtonText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ icon = "planet-outline", title, body }) {
  return (
    <Panel style={styles.empty}>
      <Ionicons name={icon} size={32} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </Panel>
  );
}

export function LoadingState({ label = "Loading" }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.cyan} />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: 104,
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.panel
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  pill_cyan: { backgroundColor: "rgba(66, 217, 214, 0.18)" },
  pill_amber: { backgroundColor: "rgba(241, 184, 75, 0.18)" },
  pill_green: { backgroundColor: "rgba(139, 209, 124, 0.18)" },
  pill_rose: { backgroundColor: "rgba(239, 107, 123, 0.18)" },
  pill_violet: { backgroundColor: "rgba(156, 140, 255, 0.18)" },
  pillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  iconButton: {
    minHeight: 42,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  button_cyan: { backgroundColor: colors.cyan },
  button_amber: { backgroundColor: colors.amber },
  button_green: { backgroundColor: colors.green },
  button_rose: { backgroundColor: colors.rose },
  button_violet: { backgroundColor: colors.violet },
  iconButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800"
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
  empty: {
    alignItems: "center",
    gap: spacing.sm
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  loading: {
    flex: 1,
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md
  }
});
