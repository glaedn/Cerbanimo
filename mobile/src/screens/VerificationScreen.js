import React, { useState, useRef } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { useApp } from "../AppRoot";
import {
  Header,
  Screen,
  SectionTitle,
  LargeButton,
  IconButton,
  Panel
} from "../components/AppShell";
import { colors, radii, spacing } from "../theme";
import { SyncEngine } from "../services/SyncEngine";
import * as Location from "expo-location";

export function VerificationScreen({ route, navigation }) {
  const { missionId } = route?.params || {};
  const { api, profile } = useApp();
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  const syncEngine = new SyncEngine(api);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Header title="Camera Access" subtitle="Verification requires camera permissions." />
        <LargeButton label="Grant Permission" onPress={requestPermission} />
      </Screen>
    );
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true
      });
      setPhoto(result);
    }
  }

  async function upload() {
    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      await syncEngine.enqueueAction("VERIFICATION_UPLOAD", {
        missionId,
        userId: profile.id,
        photo: photo.uri,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString()
      });
      navigation.goBack();
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title="Verification" subtitle="Capture proof of mission fulfillment." />

      {!photo ? (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <TouchableOpacity style={styles.shutter} onPress={takePhoto}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      ) : (
        <Panel style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <IconButton
              icon="refresh"
              label="Retake"
              onPress={() => setPhoto(null)}
              tone="rose"
            />
            <LargeButton
              label="Submit Proof"
              icon="cloud-upload-outline"
              onPress={upload}
              tone="green"
              loading={loading}
            />
          </View>
        </Panel>
      )}

      <SectionTitle>Guidelines</SectionTitle>
      <Text style={styles.guideText}>
        Ensure the subject is clearly visible. Geotagging and timestamping are performed automatically.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    height: 400,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: "black"
  },
  camera: {
    flex: 1
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: spacing.xl
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    justifyContent: "center",
    alignItems: "center"
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.white
  },
  previewContainer: {
    padding: spacing.md,
    gap: spacing.md
  },
  preview: {
    width: "100%",
    height: 300,
    borderRadius: radii.md
  },
  previewActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  guideText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
