import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  UNITS,
  checkReceipt,
  draftToCheckable,
  draftToReceipt,
  emptyDraftItem,
  type Draft,
  type DraftItem,
} from "@bill-manager/shared";
import { Button, Card, Field, Warnings } from "../components/ui";
import { saveReceipt } from "../lib/db";
import { getDraft, setDraft as storeDraft } from "../lib/draft-store";
import { persistImage } from "../lib/images";
import { colors, spacing } from "../lib/theme";

const UNIT_LABELS: Record<DraftItem["unit"], string> = { unit: "units", kg: "kg", g: "g", l: "l", ml: "ml" };

export default function ReviewScreen() {
  const db = useSQLiteContext();
  const [draft, setDraft] = useState<Draft | null>(() => getDraft());
  const [saving, setSaving] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const warnings = useMemo(() => (draft ? checkReceipt(draftToCheckable(draft)) : []), [draft]);

  if (!draft) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>There is no receipt to review.</Text>
        <Button title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    update({ items: draft.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const removeItem = (index: number) => update({ items: draft.items.filter((_, i) => i !== index) });
  const cycleUnit = (index: number) => {
    const next = UNITS[(UNITS.indexOf(draft.items[index].unit) + 1) % UNITS.length];
    updateItem(index, { unit: next });
  };

  async function save() {
    if (!draft) return;
    const result = draftToReceipt(draft);
    if (!result.ok) {
      Alert.alert("Some values need fixing", result.errors.join("\n"));
      return;
    }
    setSaving(true);
    try {
      const receipt = result.receipt;
      if (receipt.image_uri) receipt.image_uri = await persistImage(receipt.image_uri);
      const id = await saveReceipt(db, receipt, draft.id);
      storeDraft(null);
      if (draft.id === null) {
        router.replace({ pathname: "/receipt/[id]", params: { id: String(id) } });
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Warnings warnings={warnings} />
      {draft.image_uri ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photoOpen ? "Make receipt photo smaller" : "Make receipt photo bigger"}
          onPress={() => setPhotoOpen(!photoOpen)}
        >
          <Image
            source={{ uri: draft.image_uri }}
            style={[styles.photo, photoOpen && styles.photoOpen]}
            resizeMode={photoOpen ? "contain" : "cover"}
          />
          <Text style={styles.photoHint}>{photoOpen ? "Tap to shrink the photo" : "Tap to compare with the photo"}</Text>
        </Pressable>
      ) : null}
      {draft.notes ? (
        <Card>
          <Text style={styles.notesTitle}>Note from the scan</Text>
          <Text style={styles.notes}>{draft.notes}</Text>
        </Card>
      ) : null}

      <Card>
        <Field label="Store" value={draft.store} onChangeText={(store) => update({ store })} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Date"
              hint="YYYY-MM-DD"
              value={draft.date}
              onChangeText={(date) => update({ date })}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Time"
              hint="HH:MM"
              value={draft.time}
              onChangeText={(time) => update({ time })}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
        <Field
          label={`Total (${draft.currency})`}
          value={draft.total}
          onChangeText={(total) => update({ total })}
          keyboardType="decimal-pad"
        />
      </Card>

      <Text style={styles.sectionTitle}>Items ({draft.items.length})</Text>
      {draft.items.map((item, index) => (
        <View key={item.key} style={[styles.item, item.uncertain && styles.itemUncertain]}>
          {item.uncertain && (
            <View style={styles.uncertainRow}>
              <Text style={styles.uncertainText}>This line may be wrong. Check it against the receipt.</Text>
              <Pressable accessibilityRole="button" onPress={() => updateItem(index, { uncertain: false })}>
                <Text style={styles.link}>Looks right</Text>
              </Pressable>
            </View>
          )}
          <Field label="Name (English)" value={item.name_en} onChangeText={(name_en) => updateItem(index, { name_en })} />
          <Field
            label="As printed on the receipt"
            value={item.name_original}
            onChangeText={(name_original) => updateItem(index, { name_original })}
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                label="Quantity"
                value={item.quantity}
                onChangeText={(quantity) => updateItem(index, { quantity })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.unitBox}>
              <Text style={styles.unitLabel}>Unit</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Changes the unit"
                onPress={() => cycleUnit(index)}
                style={styles.unitButton}
              >
                <Text style={styles.unitText}>{UNIT_LABELS[item.unit]}</Text>
              </Pressable>
            </View>
            <View style={styles.flex}>
              <Field
                label="Unit price"
                value={item.unit_price}
                onChangeText={(unit_price) => updateItem(index, { unit_price })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Price"
                value={item.price}
                onChangeText={(price) => updateItem(index, { price })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => removeItem(index)}>
            <Text style={styles.remove}>Remove item</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.actions}>
        <Button title="Add item" variant="secondary" onPress={() => update({ items: [...draft.items, emptyDraftItem()] })} />
        <Button title="Save receipt" onPress={save} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  missing: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.lg },
  missingText: { fontSize: 16, textAlign: "center", color: colors.text },
  photo: { width: "100%", height: 140, borderRadius: 12, backgroundColor: colors.surface },
  photoOpen: { height: 560 },
  photoHint: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.md },
  notesTitle: { fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  notes: { color: colors.text },
  row: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginVertical: spacing.sm },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUncertain: { borderColor: colors.warningBorder, backgroundColor: colors.warningBg },
  uncertainRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  uncertainText: { flex: 1, color: colors.warningText, fontSize: 13 },
  link: { color: colors.primary, fontWeight: "600" },
  unitBox: { marginBottom: spacing.md },
  unitLabel: { fontSize: 13, color: colors.muted, marginBottom: spacing.xs },
  unitButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    minWidth: 56,
    alignItems: "center",
  },
  unitText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  remove: { color: colors.danger, fontWeight: "600", alignSelf: "flex-end" },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
