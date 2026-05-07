import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { EmptyState, Header, IconButton, Panel, Screen, SectionTitle } from "../components/AppShell";
import { TaskCard } from "../components/Cards";
import { Field } from "../components/Forms";
import { colors, spacing } from "../theme";
import { skillNames } from "../utils/data";

export function TasksScreen() {
  const { api, profile } = useApp();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState([]);
  const [relevant, setRelevant] = useState([]);
  const [review, setReview] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submission, setSubmission] = useState("");

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const skills = skillNames(profile);
      const [activeTasks, relevantTasks, reviewTasks] = await Promise.all([
        api.get("/tasks/accepted", { userId: String(profile.id) }),
        skills.length ? api.get("/tasks/relevant", { skills }) : Promise.resolve([]),
        api.get(`/tasks/reviewer/${profile.id}`).catch(() => [])
      ]);
      setActive(Array.isArray(activeTasks) ? activeTasks : []);
      setRelevant(Array.isArray(relevantTasks) ? relevantTasks : []);
      setReview(Array.isArray(reviewTasks) ? reviewTasks : []);
    } catch (error) {
      Alert.alert("Tasks failed to load", error.message);
    } finally {
      setLoading(false);
    }
  }, [api, profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(task) {
    try {
      await api.put(`/tasks/${task.id}/accept`, { userId: profile.id });
      load();
    } catch (error) {
      Alert.alert("Unable to accept", error.message);
    }
  }

  async function drop(task) {
    try {
      await api.put(`/tasks/${task.id}/drop`, { userId: profile.id });
      load();
    } catch (error) {
      Alert.alert("Unable to drop", error.message);
    }
  }

  async function submit() {
    if (!selected) return;
    try {
      await api.post(`/tasks/${selected.id}/submit`, {
        submissionContent: submission,
        userId: profile.id,
        platformUserId: profile.id
      });
      setSelected(null);
      setSubmission("");
      load();
    } catch (error) {
      Alert.alert("Unable to submit", error.message);
    }
  }

  async function reviewTask(task, action) {
    try {
      await api.put(`/tasks/${task.id}/review`, { userId: profile.id, action });
      load();
    } catch (error) {
      Alert.alert("Review failed", error.message);
    }
  }

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header title="Tasks" subtitle="Claim, submit, drop, and review missions from the native app." />

      <SectionTitle>My Missions</SectionTitle>
      {active.length ? active.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          action={
            <View style={styles.actions}>
              <IconButton icon="send-outline" label="Submit" onPress={() => setSelected(task)} tone="cyan" />
              <IconButton icon="close-circle-outline" label="Drop" onPress={() => drop(task)} tone="rose" />
            </View>
          }
        />
      )) : <EmptyState title="No claimed tasks" body="Suggested missions appear below." />}

      <SectionTitle>Skill Matches</SectionTitle>
      {relevant.length ? relevant.slice(0, 20).map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          action={<IconButton icon="add-circle-outline" label="Accept" onPress={() => accept(task)} tone="green" />}
        />
      )) : <EmptyState icon="compass-outline" title="No matching work" body="Update your profile skills or create new tasks in a project." />}

      <SectionTitle>Review Queue</SectionTitle>
      {review.length ? review.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          action={
            <View style={styles.actions}>
              <IconButton icon="checkmark-circle-outline" label="Approve" onPress={() => reviewTask(task, "approve")} tone="green" />
              <IconButton icon="ban-outline" label="Reject" onPress={() => reviewTask(task, "reject")} tone="rose" />
            </View>
          }
        />
      )) : <EmptyState icon="shield-checkmark-outline" title="Nothing to review" body="Submitted tasks assigned to you will land here." />}

      <Modal visible={Boolean(selected)} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <Panel style={styles.modal}>
            <Text style={styles.modalTitle}>Submit work</Text>
            <Text style={styles.modalBody}>{selected?.name}</Text>
            <Field label="Proof or notes" value={submission} onChangeText={setSubmission} multiline placeholder="Links, details, or completion notes" />
            <View style={styles.actions}>
              <IconButton icon="close-outline" label="Cancel" onPress={() => setSelected(null)} tone="rose" />
              <IconButton icon="send-outline" label="Submit" onPress={submit} tone="green" />
            </View>
          </Panel>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  modal: {
    gap: spacing.md
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  modalBody: {
    color: colors.muted,
    fontSize: 14
  }
});
