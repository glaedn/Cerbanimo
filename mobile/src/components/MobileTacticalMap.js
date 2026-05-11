import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { colors, radii, spacing } from "../theme";
import { useCoordinationStore } from "../store/useCoordinationStore";

MapLibreGL.setAccessToken(null);

export function MobileTacticalMap({ signals = [], missions = [] }) {
  const { lastLocation, isCrisisMode } = useCoordinationStore();

  const center = useMemo(() => {
    if (lastLocation) return [lastLocation.longitude, lastLocation.latitude];
    return [-122.4194, 37.7749];
  }, [lastLocation]);

  const signalFeatures = useMemo(() => ({
    type: "FeatureCollection",
    features: signals.map(s => ({
      type: "Feature",
      id: s.id,
      properties: { type: s.type, priority: s.priority },
      geometry: {
        type: "Point",
        coordinates: [s.locationLon || center[0], s.locationLat || center[1]]
      }
    }))
  }), [signals, center]);

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL="https://tiles.basemaps.cartocp.com/gl/dark-matter-gl-style/style.json"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          zoomLevel={14}
          centerCoordinate={center}
          animationMode="flyTo"
          animationDuration={2000}
        />

        <MapLibreGL.ShapeSource id="signalsSource" shape={signalFeatures}>
          <MapLibreGL.CircleLayer
            id="signalsLayer"
            style={{
              circleRadius: 8,
              circleColor: [
                "step",
                ["get", "priority"],
                colors.cyan,
                2, colors.amber,
                4, colors.rose
              ],
              circleStrokeWidth: 2,
              circleStrokeColor: colors.white,
              circleOpacity: isCrisisMode ? 1 : 0.7
            }}
          />
        </MapLibreGL.ShapeSource>

        <MapLibreGL.UserLocation
          visible={true}
          renderMode="native"
          androidRenderMode="compass"
        />
      </MapLibreGL.MapView>

      {isCrisisMode && (
        <View style={styles.crisisOverlay}>
          <Text style={styles.crisisText}>TACTICAL OVERLAY ACTIVE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line
  },
  map: {
    flex: 1
  },
  crisisOverlay: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.crisis,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm
  },
  crisisText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900"
  }
});
