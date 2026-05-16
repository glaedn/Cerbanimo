import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { useCoordinationStore } from "../store/useCoordinationStore";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";
import withObservables from "@nozbe/with-observables";
import {
  EmptyState,
  Panel,
  Screen,
  SectionTitle,
  TacticalHeader,
  Pill,
  LargeButton
} from "../components/AppShell";
import { TaskCard } from "../components/Cards";
import { colors, spacing } from "../theme";
import * as Location from "expo-location";

function TacticalHome({ missions, signals, onMissionPress }) {
  const { isCrisisMode, toggleCrisisMode, fatigueLevel, updateFatigue, setLastLocation } = useCoordinationStore();
  const [locationName, setLocationName] = useState("Acquiring position...");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("Permission denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLastLocation(location.coords);

      let reverse = await Location.reverseGeocodeAsync(location.coords);
      if (reverse[0]) {
        setLocationName(`${reverse[0].street || ""}, ${reverse[0].city || ""}`);
      }
    })();
  }, [setLastLocation]);

  return (
    <Screen>
      <TacticalHeader
        title={locationName}
        isCrisis={isCrisisMode}
        onCrisisToggle={toggleCrisisMode}
        urgency={isCrisisMode ? "high" : null}
      />

      <Panel style={styles.statusPanel}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>OPERATIONAL CAPACITY</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(1 - fatigueLevel) * 100}%`, backgroundColor: fatigueLevel > 0.8 ? colors.rose : colors.tactical }]} />
            </View>
          </View>
          <Pill tone={fatigueLevel > 0.8 ? "rose" : "green"}>
            {Math.round((1 - fatigueLevel) * 100)}%
          </Pill>
        </View>
      </Panel>

      <SectionTitle>Active Missions</SectionTitle>
      {missions.length > 0 ? (
        missions.map(m => (
          <TaskCard
            key={m.id}
            task={{
              id: m.remoteId,
              name: m.title,
              description: m.description,
              status: m.status,
              urgency: m.urgency
            }}
            onPress={() => onMissionPress?.(m)}
          />
        ))
      ) : (
        <EmptyState title="No missions assigned" body="Signals below may require response." />
      )}

      <SectionTitle>Nearby Signals</SectionTitle>
      {signals.length > 0 ? (
        signals.map(s => (
          <Panel key={s.id} style={styles.signalCard}>
            <View style={styles.row}>
              <Pill tone={s.priority > 2 ? "rose" : "amber"}>{s.type}</Pill>
              <Text style={styles.time}>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={styles.signalMsg}>{s.message}</Text>
          </Panel>
        ))
      ) : (
        <EmptyState icon="radio-outline" title="Airwaves clear" body="Ambient sensor network is quiet." />
      )}

      <View style={styles.quickActions}>
        <LargeButton
          label="Report Status"
          icon="megaphone-outline"
          onPress={() => updateFatigue(0.1)}
          tone="cyan"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusPanel: {
    padding: spacing.md,
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4
  },
  track: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden"
  },
  fill: {
    height: "100%"
  },
  signalCard: {
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber
  },
  signalMsg: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600"
  },
  time: {
    color: colors.muted,
    fontSize: 12
  },
  quickActions: {
    marginTop: spacing.md,
    paddingBottom: spacing.xxl
  }
});

const enhance = withObservables([], () => ({
  missions: database.get("missions").query(Q.where("status", Q.notEq("completed"))),
  signals: database.get("signals").query(Q.sortBy("created_at", Q.desc), Q.take(5))
}));

export const TacticalHomeScreen = enhance(TacticalHome);
