import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Panel, Pill } from "./AppShell";
import { colors, spacing } from "../theme";
import { compactDate, taskStatusTone } from "../utils/data";

export function MetricStrip({ metrics }) {
  return (
    <View style={cardStyles.metricStrip}>
      {metrics.map((metric) => (
        <View key={metric.label} style={cardStyles.metric}>
          <Text style={cardStyles.metricValue}>{metric.value}</Text>
          <Text style={cardStyles.metricLabel}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function TaskCard({ task, onPress, action }) {
  const status = task.status || "available";
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Panel style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Pill tone={taskStatusTone(status)}>{status}</Pill>
          <Text style={cardStyles.reward}>{task.reward_tokens || 0} ct</Text>
        </View>
        <Text style={cardStyles.title}>{task.name || task.title || "Untitled task"}</Text>
        <Text style={cardStyles.body} numberOfLines={3}>{task.description || "No mission brief yet."}</Text>
        <View style={cardStyles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={cardStyles.meta}>{compactDate(task.due_date)}</Text>
          {task.project_name ? <Text style={cardStyles.meta}>{task.project_name}</Text> : null}
        </View>
        {action}
      </Panel>
    </Pressable>
  );
}

export function ProjectCard({ project, onPress }) {
  const completed = Number(project.completed_task_count || 0);
  const total = Number(project.task_count || 0);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <Pressable onPress={onPress}>
      <Panel style={cardStyles.card}>
        <View style={cardStyles.row}>
          <Pill tone={project.status === "active" ? "green" : "violet"}>{project.status || "project"}</Pill>
          <Text style={cardStyles.reward}>{progress}%</Text>
        </View>
        <Text style={cardStyles.title}>{project.name || "Untitled project"}</Text>
        <Text style={cardStyles.body} numberOfLines={3}>{project.description || "No project description."}</Text>
        <View style={cardStyles.progressTrack}>
          <View style={[cardStyles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={cardStyles.meta}>{completed} of {total} tasks completed</Text>
      </Panel>
    </Pressable>
  );
}

export function NeedCard({ item, action }) {
  return (
    <Panel style={cardStyles.card}>
      <View style={cardStyles.row}>
        <Pill tone={item.urgency === "high" ? "rose" : "amber"}>{item.urgency || "need"}</Pill>
        <Text style={cardStyles.meta}>{item.category || "General"}</Text>
      </View>
      <Text style={cardStyles.title}>{item.name || "Unnamed need"}</Text>
      <Text style={cardStyles.body} numberOfLines={3}>{item.description || "No description."}</Text>
      {action}
    </Panel>
  );
}

export function ResourceCard({ item }) {
  return (
    <Panel style={cardStyles.card}>
      <View style={cardStyles.row}>
        <Pill tone={item.status === "available" ? "green" : "amber"}>{item.status || "resource"}</Pill>
        <Text style={cardStyles.meta}>{item.quantity || 1} {item.unit || ""}</Text>
      </View>
      <Text style={cardStyles.title}>{item.name || "Unnamed resource"}</Text>
      <Text style={cardStyles.body} numberOfLines={3}>{item.description || item.category || "No description."}</Text>
      {item.location_text ? <Text style={cardStyles.meta}>{item.location_text}</Text> : null}
    </Panel>
  );
}

export const cardStyles = StyleSheet.create({
  card: { gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  reward: {
    color: colors.amber,
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.green
  },
  metricStrip: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metric: {
    flex: 1,
    backgroundColor: colors.panelSoft,
    borderRadius: 8,
    padding: spacing.md
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  }
});
