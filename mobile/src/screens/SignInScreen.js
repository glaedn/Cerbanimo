import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { Header, IconButton, Panel, Screen } from "../components/AppShell";
import { Field } from "../components/Forms";
import { colors, spacing } from "../theme";

export function SignInScreen() {
  const { signInWithAuth0, signInWithToken, bootError } = useApp();
  const [token, setToken] = useState("");
  const [sub, setSub] = useState("");

  async function submitToken() {
    try {
      await signInWithToken({ token: token.trim(), sub: sub.trim() });
    } catch (error) {
      Alert.alert("Unable to use token", error.message);
    }
  }

  return (
    <Screen>
      <Header title="Native mission control" subtitle="Sign in to sync your tasks, projects, needs, resources, and reputation trail." />
      <Panel style={styles.hero}>
        <View style={styles.orbit}>
          <View style={styles.core} />
          <View style={[styles.node, styles.nodeA]} />
          <View style={[styles.node, styles.nodeB]} />
          <View style={[styles.node, styles.nodeC]} />
        </View>
        <Text style={styles.copy}>A React Native rewrite of the platform, wired for iOS and Android through the existing Cerbanimo backend.</Text>
        <IconButton icon="log-in-outline" label="Sign in with Auth0" onPress={signInWithAuth0} />
      </Panel>

      <Panel style={styles.form}>
        <Text style={styles.formTitle}>Development access</Text>
        <Text style={styles.help}>Use this while your Auth0 native client is being configured.</Text>
        <Field label="Access token" value={token} onChangeText={setToken} placeholder="Bearer token without the word Bearer" multiline />
        <Field label="Auth0 subject" value={sub} onChangeText={setSub} placeholder="auth0|..." />
        <IconButton icon="key-outline" label="Use token" onPress={submitToken} tone="violet" />
      </Panel>

      {bootError ? <Text style={styles.error}>{bootError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg },
  orbit: {
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1a2d"
  },
  core: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cyan
  },
  node: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14
  },
  nodeA: { backgroundColor: colors.amber, top: 28, left: 58 },
  nodeB: { backgroundColor: colors.green, right: 50, top: 72 },
  nodeC: { backgroundColor: colors.violet, bottom: 26, left: 128 },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  form: { gap: spacing.md },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  help: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  error: {
    color: colors.rose,
    fontWeight: "700"
  }
});
