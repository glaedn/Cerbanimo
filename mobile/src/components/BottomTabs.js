import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme";

const tabs = [
  { key: "dashboard", label: "Home", icon: "grid-outline" },
  { key: "projects", label: "Projects", icon: "git-network-outline" },
  { key: "tasks", label: "Tasks", icon: "checkmark-done-outline" },
  { key: "exchange", label: "Exchange", icon: "swap-horizontal-outline" },
  { key: "tray", label: "More", icon: "apps-outline" }
];

const trayItems = [
  { key: "dashboard", label: "Dashboard", icon: "grid-outline", meta: "Command center" },
  { key: "projects", label: "Projects", icon: "git-network-outline", meta: "Plans and task maps" },
  { key: "tasks", label: "Tasks", icon: "checkmark-done-outline", meta: "Claim, submit, review" },
  { key: "exchange", label: "Exchange", icon: "swap-horizontal-outline", meta: "Needs and resources" },
  { key: "notifications", label: "Notifications", icon: "notifications-outline", meta: "Approvals and events" },
  { key: "profile", label: "Profile", icon: "person-circle-outline", meta: "Identity and capacity" }
];

export function BottomTabs({ active, onChange, unreadCount = 0 }) {
  const [trayOpen, setTrayOpen] = useState(false);

  function select(key) {
    if (key === "tray") {
      setTrayOpen(true);
      return;
    }
    onChange(key);
  }

  function selectTray(key) {
    setTrayOpen(false);
    onChange(key);
  }

  return (
    <>
      <View style={styles.wrap}>
        {tabs.map((tab) => {
          const selected = active === tab.key || (tab.key === "tray" && !tabs.some((item) => item.key === active));
          return (
            <Pressable
              key={tab.key}
              onPress={() => select(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.tab, selected && styles.selected, pressed && styles.pressed]}
            >
              <View>
                <Ionicons name={tab.icon} size={20} color={selected ? colors.cyan : colors.muted} />
                {tab.key === "tray" && unreadCount > 0 ? (
                  <View style={styles.dot}>
                    <Text style={styles.dotText}>{Math.min(unreadCount, 9)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={trayOpen} animationType="fade" transparent onRequestClose={() => setTrayOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setTrayOpen(false)}>
          <Pressable style={styles.tray}>
            <View style={styles.trayHead}>
              <View style={styles.trayMark}>
                <Ionicons name="rocket-outline" size={18} color={colors.cyan} />
              </View>
              <View>
                <Text style={styles.trayTitle}>Route Tray</Text>
                <Text style={styles.trayMeta}>All native surfaces</Text>
              </View>
            </View>
            {trayItems.map((item) => {
              const selected = active === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => selectTray(item.key)}
                  style={({ pressed }) => [
                    styles.trayItem,
                    selected && styles.trayItemActive,
                    pressed && styles.pressed
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.cyan} />
                  <View style={styles.trayCopy}>
                    <Text style={styles.trayItemText}>{item.label}</Text>
                    <Text style={styles.trayItemMeta}>{item.meta}</Text>
                  </View>
                  {item.key === "notifications" && unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{Math.min(unreadCount, 99)}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    backgroundColor: "rgba(5, 16, 34, 0.94)",
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    padding: spacing.xs,
    shadowColor: colors.cyan,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: radii.sm
  },
  selected: {
    backgroundColor: "rgba(95, 240, 255, 0.12)"
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.97 }]
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  selectedLabel: {
    color: colors.text
  },
  dot: {
    position: "absolute",
    right: -9,
    top: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3
  },
  dotText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900"
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: spacing.md
  },
  tray: {
    width: "88%",
    maxWidth: 360,
    borderRadius: radii.md,
    backgroundColor: "rgba(5, 16, 34, 0.98)",
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.sm
  },
  trayHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm
  },
  trayMark: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 240, 255, 0.08)"
  },
  trayTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  trayMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  trayItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "rgba(95, 240, 255, 0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  trayItemActive: {
    borderColor: colors.cyan,
    backgroundColor: "rgba(95, 240, 255, 0.12)"
  },
  trayCopy: {
    flex: 1
  },
  trayItemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  trayItemMeta: {
    color: colors.muted,
    fontSize: 12
  },
  badge: {
    minWidth: 26,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.rose,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900"
  }
});
