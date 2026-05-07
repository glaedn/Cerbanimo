import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { EmptyState, Header, IconButton, LoadingState, Panel, Screen, SectionTitle } from "../components/AppShell";
import { MetricStrip, TaskCard } from "../components/Cards";
import { colors, spacing } from "../theme";
import { levelFromXp, skillNames, xpFromSkills } from "../utils/data";

export function DashboardScreen() {
  const { api, profile, authUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState([]);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [skills, setSkills] = useState([]);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const names = skillNames(profile);
      const calls = [
        api.get("/tasks/accepted", { userId: String(profile.id) }),
        names.length ? api.get("/tasks/relevant", { skills: names }) : Promise.resolve([]),
        api.get(`/storyChronicles/user/${profile.id}/chronicle`).catch(() => []),
        api.get(`/story_engine_v2/summaries/user/${profile.id}`, { type: "weekly wrap-up" }).catch(() => []),
        api.get("/skills/all").catch(() => [])
      ];
      const [active, suggested, stories, summaries, allSkills] = await Promise.all(calls);
      setActiveTasks(Array.isArray(active) ? active : []);
      setSuggestedTasks(Array.isArray(suggested) ? suggested.slice(0, 5) : []);
      setChronicle([...(Array.isArray(stories) ? stories : []), ...(Array.isArray(summaries) ? summaries : [])].slice(0, 5));
      setSkills(Array.isArray(allSkills) ? allSkills : []);
    } catch (error) {
      Alert.alert("Dashboard failed to load", error.message);
    } finally {
      setLoading(false);
    }
  }, [api, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const level = useMemo(() => levelFromXp(xpFromSkills(skills, profile?.id)), [profile?.id, skills]);
  const openTasks = activeTasks.filter((task) => !String(task.status || "").toLowerCase().includes("completed"));

  async function acceptTask(task) {
    try {
      setSuggestedTasks((items) => items.filter((item) => item.id !== task.id));
      setActiveTasks((items) => [...items, { ...task, status: "active-assigned" }]);
      await api.put(`/tasks/${task.id}/accept`, { userId: profile.id });
      load();
    } catch (error) {
      Alert.alert("Could not accept task", error.message);
      load();
    }
  }

  if (loading && !profile) return <LoadingState label="Loading profile" />;

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header
        title={`Welcome, ${profile?.username || authUser?.given_name || "pilot"}`}
        subtitle={`Level ${level.level} Architect · ${profile?.cotokens ?? profile?.tokens ?? 0} credits`}
      />

      <Panel style={styles.heroPanel}>
        <View style={styles.map}>
          <View style={styles.traceA} />
          <View style={styles.traceB} />
          <View style={[styles.star, styles.starA]} />
          <View style={[styles.star, styles.starB]} />
          <View style={[styles.star, styles.starC]} />
          <View style={styles.ship} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(level.progress * 100)}%` }]} />
        </View>
        <Text style={styles.meta}>{Math.round(level.current)} / {Math.round(level.required)} XP to next level</Text>
      </Panel>

      <MetricStrip metrics={[
        { label: "Active", value: openTasks.length },
        { label: "Suggested", value: suggestedTasks.length },
        { label: "Stories", value: chronicle.length }
      ]} />

      <SectionTitle>Active Missions</SectionTitle>
      {openTasks.length ? openTasks.slice(0, 3).map((task) => <TaskCard key={task.id} task={task} />) : <EmptyState title="No active missions" body="Accept a suggested task to begin contributing." />}

      <SectionTitle>Suggested For You</SectionTitle>
      {suggestedTasks.length ? suggestedTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          action={<IconButton icon="add-circle-outline" label="Accept" onPress={() => acceptTask(task)} tone="green" />}
        />
      )) : <EmptyState icon="sparkles-outline" title="No skill matches yet" body="Add skills to your profile to improve routing." />}

      <SectionTitle>Recent Chronicle</SectionTitle>
      {chronicle.length ? chronicle.map((story, index) => (
        <Panel key={story.id || index}>
          <Text style={styles.storyTitle}>{story.title || story.event_type || "Chronicle entry"}</Text>
          <Text style={styles.meta}>{story.summary || story.description || story.content || "Contribution recorded."}</Text>
        </Panel>
      )) : <EmptyState icon="book-outline" title="Chronicle is quiet" body="Approved work will appear here as reputation history." />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroPanel: { gap: spacing.md },
  map: {
    height: 170,
    borderRadius: 8,
    backgroundColor: "#0a1a2b",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line
  },
  traceA: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: "rgba(66,217,214,0.28)",
    left: -30,
    top: -52
  },
  traceB: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: "rgba(241,184,75,0.24)",
    right: -20,
    top: 14
  },
  star: { position: "absolute", width: 16, height: 16, borderRadius: 8 },
  starA: { backgroundColor: colors.cyan, left: 58, top: 44 },
  starB: { backgroundColor: colors.amber, right: 82, top: 78 },
  starC: { backgroundColor: colors.green, left: 150, bottom: 28 },
  ship: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.violet,
    right: 42,
    bottom: 34,
    transform: [{ rotate: "45deg" }]
  },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  progressFill: {
    height: 9,
    backgroundColor: colors.cyan
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  storyTitle: {
    color: colors.text,
    fontWeight: "800",
    marginBottom: spacing.xs
  }
});
