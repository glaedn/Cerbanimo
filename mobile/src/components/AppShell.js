import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, spacing } from "../theme";

const stars = [
  [9, 14, 2], [18, 46, 1], [28, 22, 2], [38, 76, 1], [52, 12, 2],
  [64, 34, 1], [74, 66, 2], [88, 26, 1], [93, 72, 2], [13, 88, 1],
  [45, 84, 2], [69, 89, 1], [82, 8, 1], [7, 38, 2], [58, 70, 1]
];

function SpaceField() {
  return (
    <View pointerEvents="none" style={styles.spaceField}>
      <View style={styles.nebulaA} />
      <View style={styles.nebulaB} />
      <View style={styles.orbitA} />
      <View style={styles.orbitB} />
      {stars.map(([left, top, size], index) => (
        <View
          key={index}
          style={[
            styles.star,
            {
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              borderRadius: size / 2
            }
          ]}
        />
      ))}
    </View>
  );
}

export function Screen({ children, refreshing, onRefresh }) {
  return (
    <LinearGradient colors={[colors.bg, colors.bg2, "#040816"]} style={styles.fill}>
      <SpaceField />
      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.scroll}
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
  scroll: { zIndex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: 72,
    paddingBottom: 104,
    gap: spacing.lg
  },
  spaceField: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden"
  },
  nebulaA: {
    position: "absolute",
    left: -120,
    top: 80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(95, 240, 255, 0.14)"
  },
  nebulaB: {
    position: "absolute",
    right: -130,
    bottom: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 92, 162, 0.12)"
  },
  orbitA: {
    position: "absolute",
    left: -70,
    top: 130,
    width: 320,
    height: 160,
    borderRadius: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(95, 240, 255, 0.18)",
    transform: [{ rotate: "-18deg" }]
  },
  orbitB: {
    position: "absolute",
    right: -90,
    bottom: 120,
    width: 340,
    height: 180,
    borderRadius: 170,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 206, 106, 0.14)",
    transform: [{ rotate: "-18deg" }]
  },
  star: {
    position: "absolute",
    backgroundColor: colors.white,
    opacity: 0.82,
    shadowColor: colors.cyan,
    shadowOpacity: 0.7,
    shadowRadius: 6
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
    borderWidth: 1,
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
