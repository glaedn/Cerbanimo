import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { EmptyState, Header, IconButton, Panel, Screen, SectionTitle } from "../components/AppShell";
import { ProjectCard, TaskCard } from "../components/Cards";
import { Field } from "../components/Forms";
import { colors, spacing } from "../theme";

export function ProjectsScreen() {
  const { api, profile, authUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const rows = await api.get("/projects/userprojects", { userId: profile.id, pageSize: 500 });
      setProjects(Array.isArray(rows) ? rows : []);
    } catch (error) {
      Alert.alert("Projects failed to load", error.message);
    } finally {
      setLoading(false);
    }
  }, [api, profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function openProject(project) {
    setSelected(project);
    try {
      const rows = await api.get("/tasks");
      setTasks(Array.isArray(rows) ? rows.filter((task) => Number(task.project_id) === Number(project.id)) : []);
    } catch (error) {
      Alert.alert("Unable to load project tasks", error.message);
    }
  }

  async function createProject() {
    try {
      await api.post("/projects/create", {
        name: projectName,
        description,
        outcomeStatement: outcome,
        auth0_id: authUser?.sub,
        tags: []
      });
      setProjectName("");
      setDescription("");
      setOutcome("");
      setFormOpen(false);
      load();
    } catch (error) {
      Alert.alert("Unable to create project", error.message);
    }
  }

  async function autoGenerate(project) {
    try {
      await api.post("/projects/auto-generate", { projectId: project.id });
      openProject(project);
    } catch (error) {
      Alert.alert("Generation failed", error.message);
    }
  }

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header
        title="Projects"
        subtitle="Create projects, inspect task maps, and generate mission plans."
        right={<IconButton icon="add-outline" label="New" onPress={() => setFormOpen(true)} />}
      />

      <SectionTitle>My Projects</SectionTitle>
      {projects.length ? projects.map((project) => (
        <ProjectCard key={project.id} project={project} onPress={() => openProject(project)} />
      )) : <EmptyState icon="folder-open-outline" title="No projects yet" body="Create one to start routing tasks and impact." />}

      <Modal visible={Boolean(selected)} animationType="slide">
        <Screen>
          <Header title={selected?.name || "Project"} subtitle={selected?.description} right={<IconButton icon="close-outline" label="Close" onPress={() => setSelected(null)} tone="rose" />} />
          <Panel style={styles.actionsPanel}>
            <IconButton icon="sparkles-outline" label="Generate Tasks" onPress={() => autoGenerate(selected)} tone="violet" />
          </Panel>
          <SectionTitle>Task Map</SectionTitle>
          {tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} />) : <EmptyState title="No tasks in this project" body="Generate or add tasks from the project tools." />}
        </Screen>
      </Modal>

      <Modal visible={formOpen} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <Panel style={styles.form}>
            <Text style={styles.modalTitle}>Create project</Text>
            <Field label="Name" value={projectName} onChangeText={setProjectName} placeholder="Community solar launch" />
            <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What needs to be coordinated?" />
            <Field label="Outcome" value={outcome} onChangeText={setOutcome} multiline placeholder="What measurable change will this produce?" />
            <View style={styles.actions}>
              <IconButton icon="close-outline" label="Cancel" onPress={() => setFormOpen(false)} tone="rose" />
              <IconButton icon="rocket-outline" label="Create" onPress={createProject} tone="green" />
            </View>
          </Panel>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsPanel: { alignItems: "flex-start" },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  form: { gap: spacing.md },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  }
});
