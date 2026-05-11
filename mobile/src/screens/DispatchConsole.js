import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import {
  Header,
  Panel,
  Screen,
  SectionTitle,
  LargeButton,
  Pill,
  IconButton
} from "../components/AppShell";
import { colors, spacing } from "../theme";
import { SyncEngine } from "../services/SyncEngine";

export function DispatchConsole({ route, navigation }) {
  const { mission } = route?.params || {};
  const { api, profile } = useApp();
  const syncEngine = new SyncEngine(api);

  async function updateStatus(status) {
    if (!mission) return;
    try {
      await syncEngine.enqueueAction("MISSION_UPDATE_STATUS", {
        missionId: mission.remoteId || mission.id,
        status,
        userId: profile.id
      });
    } catch (error) {
      console.error("Status update failed", error);
    }
  }

  if (!mission) {
    return (
      <Screen>
        <Header title="Dispatch" subtitle="Select a mission to coordinate." />
        <SectionTitle>No Active Selection</SectionTitle>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Mission Control"
        subtitle={`ID: ${mission.remoteId || mission.id}`}
        right={<IconButton icon="close" onPress={() => navigation.goBack()} tone="rose" />}
      />

      <Panel style={styles.missionCard}>
        <View style={styles.row}>
          <Pill tone={mission.urgency === "high" ? "rose" : "amber"}>
            {mission.urgency?.toUpperCase() || "NORMAL"}
          </Pill>
          <Text style={styles.status}>{mission.status?.toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{mission.title || mission.name}</Text>
        <Text style={styles.desc}>{mission.description}</Text>
      </Panel>

      <SectionTitle>Tactical Actions</SectionTitle>
      <View style={styles.actionGrid}>
        <LargeButton
          label="Accept"
          icon="checkmark-circle-outline"
          onPress={() => updateStatus("accepted")}
          tone="green"
          disabled={mission.status === "accepted"}
        />
        <LargeButton
          label="En Route"
          icon="navigate-outline"
          onPress={() => updateStatus("en-route")}
          tone="cyan"
        />
        <LargeButton
          label="Arrived"
          icon="location-outline"
          onPress={() => updateStatus("arrived")}
          tone="violet"
        />
        <LargeButton
          label="Verify / Complete"
          icon="camera-outline"
          onPress={() => navigation.navigate("Verification")}
          tone="tactical"
        />
        <LargeButton
          label="Escalate"
          icon="alert-circle-outline"
          onPress={() => updateStatus("escalated")}
          tone="rose"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missionCard: {
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  status: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  desc: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  actionGrid: {
    gap: spacing.md,
    paddingBottom: spacing.xxl
  }
});
