import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { EmptyState, Header, IconButton, Panel, Pill, Screen, SectionTitle } from "../components/AppShell";
import { Field } from "../components/Forms";
import { colors, spacing } from "../theme";
import { normalizeArray, readName } from "../utils/data";

export function ProfileScreen() {
  const { api, profile, refreshProfile, signOut } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [username, setUsername] = useState(profile?.username || "");
  const [capacity, setCapacity] = useState(profile?.capacity_status || "");
  const [discord, setDiscord] = useState(profile?.discord_user_id || "");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/notifications/${profile.id}`);
      setNotifications(data?.notifications || []);
    } catch (error) {
      Alert.alert("Notifications failed to load", error.message);
    } finally {
      setLoading(false);
    }
  }, [api, profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setUsername(profile?.username || "");
    setCapacity(profile?.capacity_status || "");
    setDiscord(profile?.discord_user_id || "");
  }, [profile]);

  async function saveProfile() {
    try {
      const body = new FormData();
      body.append("username", username);
      body.append("skills", JSON.stringify(normalizeArray(profile?.skills)));
      body.append("interests", JSON.stringify(normalizeArray(profile?.interests)));
      body.append("user_id", String(profile.id));
      body.append("contact_links", JSON.stringify(profile?.contact_links || []));
      body.append("capacity_status", capacity);
      body.append("discord_user_id", discord);
      await api.post("/profile", body);
      await refreshProfile();
      Alert.alert("Profile saved", "Your native profile changes were synced.");
    } catch (error) {
      Alert.alert("Unable to save profile", error.message);
    }
  }

  async function markRead() {
    const unread = notifications.filter((item) => !item.read).map((item) => item.id);
    if (!unread.length) return;
    try {
      await api.post("/notifications/read", { notificationIds: unread });
      load();
    } catch (error) {
      Alert.alert("Unable to mark read", error.message);
    }
  }

  const skills = normalizeArray(profile?.skills).map(readName).filter(Boolean);
  const interests = normalizeArray(profile?.interests).map(readName).filter(Boolean);

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header title="Profile" subtitle="Identity, capacity, notifications, and proof-of-work context." right={<IconButton icon="log-out-outline" label="Sign out" onPress={signOut} tone="rose" />} />

      <Panel style={styles.form}>
        <Field label="Username" value={username} onChangeText={setUsername} />
        <Field label="Capacity" value={capacity} onChangeText={setCapacity} placeholder="open, focused, unavailable" />
        <Field label="Discord user id" value={discord} onChangeText={setDiscord} />
        <IconButton icon="save-outline" label="Save profile" onPress={saveProfile} tone="green" />
      </Panel>

      <SectionTitle>Skills</SectionTitle>
      <Panel style={styles.tagPanel}>
        {skills.length ? skills.map((skill) => <Pill key={skill}>{skill}</Pill>) : <Text style={styles.meta}>No skills set.</Text>}
      </Panel>

      <SectionTitle>Interests</SectionTitle>
      <Panel style={styles.tagPanel}>
        {interests.length ? interests.map((interest) => <Pill key={interest} tone="violet">{interest}</Pill>) : <Text style={styles.meta}>No interests set.</Text>}
      </Panel>

      <SectionTitle action={<IconButton icon="mail-open-outline" label="Read" onPress={markRead} tone="cyan" />}>Notifications</SectionTitle>
      {notifications.length ? notifications.map((item) => (
        <Panel key={item.id} style={!item.read && styles.unread}>
          <View style={styles.noticeHead}>
            <Pill tone={item.read ? "violet" : "amber"}>{item.type || "notice"}</Pill>
            <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
          <Text style={styles.notice}>{item.message}</Text>
        </Panel>
      )) : <EmptyState icon="notifications-outline" title="No notifications" body="Task reviews, approvals, and community events will appear here." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  tagPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  meta: {
    color: colors.muted,
    fontSize: 13
  },
  unread: {
    borderColor: colors.amber
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
  }
});
