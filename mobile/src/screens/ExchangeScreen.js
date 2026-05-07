import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useApp } from "../AppRoot";
import { EmptyState, Header, IconButton, Panel, Screen, SectionTitle } from "../components/AppShell";
import { NeedCard, ResourceCard } from "../components/Cards";
import { Field } from "../components/Forms";
import { colors, spacing } from "../theme";

export function ExchangeScreen() {
  const { api, profile } = useApp();
  const [loading, setLoading] = useState(false);
  const [needs, setNeeds] = useState([]);
  const [resources, setResources] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [mode, setMode] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [needRows, resourceRows, communityRows] = await Promise.all([
        api.get("/needs"),
        api.get("/resources/catalog").catch(() => []),
        api.get("/communities/user/" + profile.id).catch(() => [])
      ]);
      setNeeds(Array.isArray(needRows) ? needRows : []);
      setResources(Array.isArray(resourceRows) ? resourceRows : []);
      setCommunities(Array.isArray(communityRows) ? communityRows : []);
    } catch (error) {
      Alert.alert("Exchange failed to load", error.message);
    } finally {
      setLoading(false);
    }
  }, [api, profile]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setMode(null);
    setName("");
    setDescription("");
    setCategory("");
    setQuantity("1");
  }

  async function submit() {
    try {
      if (mode === "need") {
        await api.post("/needs", {
          name,
          description,
          category,
          quantity_needed: Number(quantity) || 1,
          urgency: "normal",
          requestor_user_id: profile.id
        });
      } else {
        await api.post("/resources/add", {
          ownerUserId: profile.id,
          name,
          description,
          category,
          quantity: Number(quantity) || 1,
          unit: "unit",
          condition: "usable",
          resourceType: "item"
        });
      }
      resetForm();
      load();
    } catch (error) {
      Alert.alert("Unable to publish", error.message);
    }
  }

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header title="Exchange" subtitle="Needs, resources, communities, and matching signals in one mobile surface." />

      <View style={styles.actions}>
        <IconButton icon="megaphone-outline" label="Declare Need" onPress={() => setMode("need")} tone="amber" />
        <IconButton icon="cube-outline" label="List Resource" onPress={() => setMode("resource")} tone="green" />
      </View>

      <SectionTitle>Open Needs</SectionTitle>
      {needs.length ? needs.slice(0, 20).map((need) => <NeedCard key={need.id} item={need} />) : <EmptyState icon="heart-outline" title="No open needs" body="Declare one from the action above." />}

      <SectionTitle>Resource Catalog</SectionTitle>
      {resources.length ? resources.slice(0, 20).map((resource) => <ResourceCard key={resource.id} item={resource} />) : <EmptyState icon="cube-outline" title="No resources listed" body="Shared goods, services, and capacity will appear here." />}

      <SectionTitle>My Communities</SectionTitle>
      {communities.length ? communities.map((community) => (
        <Panel key={community.id}>
          <Text style={styles.title}>{community.name}</Text>
          <Text style={styles.meta}>{community.description || "Community coordination space"}</Text>
        </Panel>
      )) : <EmptyState icon="people-outline" title="No communities joined" body="Join or create communities from the web app while this native surface grows." />}

      <Modal visible={Boolean(mode)} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <Panel style={styles.form}>
            <Text style={styles.modalTitle}>{mode === "need" ? "Declare need" : "List resource"}</Text>
            <Field label="Name" value={name} onChangeText={setName} placeholder="What is needed or available?" />
            <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="Context, constraints, location, timing" />
            <Field label="Category" value={category} onChangeText={setCategory} placeholder="food, labor, equipment, logistics" />
            <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <View style={styles.actions}>
              <IconButton icon="close-outline" label="Cancel" onPress={resetForm} tone="rose" />
              <IconButton icon="cloud-upload-outline" label="Publish" onPress={submit} tone="green" />
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
    flexWrap: "wrap",
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.xs
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  form: { gap: spacing.md },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  }
});
