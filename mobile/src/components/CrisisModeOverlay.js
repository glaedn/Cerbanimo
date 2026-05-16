import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import { useCoordinationStore } from "../store/useCoordinationStore";

export function CrisisModeOverlay() {
  const { isCrisisMode } = useCoordinationStore();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCrisisMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isCrisisMode, pulseAnim]);

  if (!isCrisisMode) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.border,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.4]
            })
          }
        ]}
      />
      <View style={styles.indicator}>
        <Ionicons name="flash" size={12} color={colors.white} />
        <Text style={styles.text}>CRISIS MODE ACTIVE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: colors.rose
  },
  indicator: {
    position: "absolute",
    top: spacing.lg,
    alignSelf: "center",
    backgroundColor: colors.rose,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  text: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900"
  }
});
