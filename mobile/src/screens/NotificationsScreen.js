import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { EmptyState, Header, IconButton, Panel, Pill, Screen, SectionTitle } from "../components/AppShell";
import { colors, spacing } from "../theme";

function notificationText(item) {
  if (!item?.message) return "Notification received.";
  try {
    const parsed = JSON.parse(item.message);
    return parsed?.text || item.message;
  } catch {
    return item.message;
  }
}

export function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    markNotificationsRead,
    refreshNotifications
  } = useApp();

  const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);

  return (
    <Screen refreshing={notificationsLoading} onRefresh={refreshNotifications}>
      <Header
        title="Notifications"
        subtitle={`${unreadCount} unread signal${unreadCount === 1 ? "" : "s"}`}
        right={unreadIds.length ? (
          <IconButton icon="mail-open-outline" label="Read" onPress={() => markNotificationsRead(unreadIds)} tone="cyan" />
        ) : null}
      />

      <SectionTitle>Signal Log</SectionTitle>
      {notifications.length ? notifications.map((item) => (
        <Panel key={item.id} style={!item.read && styles.unread}>
          <View style={styles.noticeHead}>
            <Pill tone={item.read ? "violet" : "amber"}>{item.type || "notice"}</Pill>
            <Text style={styles.meta}>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</Text>
          </View>
          <Text style={styles.notice}>{notificationText(item)}</Text>
        </Panel>
      )) : (
        <EmptyState icon="notifications-outline" title="No notifications" body="Task reviews, approvals, and community events will appear here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unread: {
    borderColor: colors.amber,
    backgroundColor: "rgba(255, 206, 106, 0.08)"
  },
  noticeHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm
  },
  notice: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  meta: {
    color: colors.muted,
    fontSize: 12
  }
});
