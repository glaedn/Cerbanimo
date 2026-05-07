import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing } from "../theme";

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function SelectRow({ label, value }) {
  return (
    <View style={styles.selectRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  input: {
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.bg2,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  selectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  value: {
    color: colors.cyan,
    fontWeight: "800"
  }
});
