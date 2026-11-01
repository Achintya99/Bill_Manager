import { useCallback, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { draftFromReceipt, formatDate, formatMoney } from "@bill-manager/shared";
import { Button, Card } from "../../components/ui";
import { deleteReceipt, getReceipt, type SavedReceipt } from "../../lib/db";
import { setDraft } from "../../lib/draft-store";
import { deleteImage } from "../../lib/images";
import { colors, spacing } from "../../lib/theme";

const PAYMENT_LABELS = { card: "Card", cash: "Cash", other: "Other" } as const;

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = Number(id);
  const db = useSQLiteContext();
  const [receipt, setReceipt] = useState<SavedReceipt | null | undefined>(undefined);
  const [showImage, setShowImage] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getReceipt(db, receiptId).then((r) => {
        if (active) setReceipt(r);
      });
      return () => {
        active = false;
      };
    }, [db, receiptId]),
  );

  if (receipt === undefined) return null;
  if (receipt === null) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This receipt no longer exists.</Text>
      </View>
    );
  }

  const r = receipt;
  const edit = () => {
    setDraft(draftFromReceipt(r.id, r));
    router.push("/review");
  };
  const confirmDelete = () =>
    Alert.alert("Delete receipt?", "The receipt and its photo will be removed from this phone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReceipt(db, r.id);
          deleteImage(r.image_uri);
          router.back();
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.store}>{r.store ?? "Unknown store"}</Text>
          {r.store_address ? <Text style={styles.meta}>{r.store_address}</Text> : null}
          <Text style={styles.meta}>
            {[r.date ? formatDate(r.date) : "No date", r.time, r.payment_method ? PAYMENT_LABELS[r.payment_method] : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={styles.total}>{r.total === null ? "No total" : formatMoney(r.total, r.currency)}</Text>
        </Card>

        {r.image_uri ? (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel="Show receipt photo" onPress={() => setShowImage(true)}>
            <Image source={{ uri: r.image_uri }} style={styles.thumb} resizeMode="cover" />
            <Text style={styles.thumbHint}>Tap to see the full photo</Text>
          </Pressable>
        ) : null}

        <Card>
          {r.items.map((item, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
              <View style={styles.flex}>
                <Text style={styles.itemName}>
                  {item.name_en}
                  {item.uncertain ? "  ⚠︎" : ""}
                </Text>
                <Text style={styles.itemOriginal}>{item.name_original}</Text>
                {item.quantity !== 1 || item.unit !== "unit" ? (
                  <Text style={styles.itemOriginal}>
                    {item.quantity} {item.unit === "unit" ? "×" : item.unit}
                    {item.unit_price !== null ? ` @ ${formatMoney(item.unit_price, r.currency)}${item.unit === "unit" ? "" : `/${item.unit}`}` : ""}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.itemPrice}>{formatMoney(item.price, r.currency)}</Text>
            </View>
          ))}
          {r.items.length === 0 ? <Text style={styles.meta}>No items.</Text> : null}
        </Card>

        <View style={styles.actions}>
          <Button title="Edit" variant="secondary" onPress={edit} />
          <Button title="Delete" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>

      <Modal visible={showImage} animationType="fade" onRequestClose={() => setShowImage(false)}>
        <SafeAreaView style={styles.modal}>
          <ScrollView maximumZoomScale={4} minimumZoomScale={1} contentContainerStyle={styles.flexGrow}>
            {r.image_uri ? <Image source={{ uri: r.image_uri }} style={styles.fullImage} resizeMode="contain" /> : null}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button title="Close" variant="secondary" onPress={() => setShowImage(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  container: { padding: spacing.lg },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  missingText: { fontSize: 16, color: colors.text },
  store: { fontSize: 20, fontWeight: "700", color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: spacing.xs },
  total: { fontSize: 24, fontWeight: "700", color: colors.text, marginTop: spacing.md },
  thumb: { width: "100%", height: 160, borderRadius: 12, backgroundColor: colors.surface },
  thumbHint: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.md },
  item: { flexDirection: "row", paddingVertical: spacing.sm, gap: spacing.md },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { fontSize: 15, color: colors.text, fontWeight: "500" },
  itemOriginal: { fontSize: 12, color: colors.muted, marginTop: 2 },
  itemPrice: { fontSize: 15, color: colors.text, fontWeight: "600" },
  actions: { gap: spacing.sm },
  modal: { flex: 1, backgroundColor: "#000" },
  fullImage: { flex: 1, width: "100%", minHeight: 500 },
  modalFooter: { padding: spacing.lg },
});
