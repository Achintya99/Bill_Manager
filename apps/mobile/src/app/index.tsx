import { useCallback, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDate, formatMoney, groupByDate } from "@bill-manager/shared";
import { Button } from "../components/ui";
import { listReceipts, type ReceiptSummary } from "../lib/db";
import { colors, spacing } from "../lib/theme";

export default function ReceiptsScreen() {
  const db = useSQLiteContext();
  const [receipts, setReceipts] = useState<ReceiptSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listReceipts(db).then((rows) => {
        if (active) setReceipts(rows);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const sections = useMemo(
    () =>
      groupByDate(receipts ?? []).map((g) => ({
        key: g.date ?? "undated",
        title: g.date ? formatDate(g.date) : "No date",
        total: g.total,
        data: g.receipts,
      })),
    [receipts],
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionTotal}>{formatMoney(section.total)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: String(item.id) } })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.store}>{item.store ?? "Unknown store"}</Text>
              <Text style={styles.meta}>
                {[item.time, `${item.item_count} item${item.item_count === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Text style={styles.amount}>{item.total === null ? "—" : formatMoney(item.total, item.currency)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          receipts === null ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptyText}>Scan a paper receipt to start tracking what you buy.</Text>
            </View>
          )
        }
      />
      <View style={styles.footer}>
        <Button title="Scan a receipt" onPress={() => router.push("/scan")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.lg },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  sectionTotal: { fontSize: 15, fontWeight: "700", color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.background },
  rowMain: { flex: 1 },
  store: { fontSize: 16, color: colors.text, fontWeight: "500" },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 16, color: colors.text, fontWeight: "600" },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: "center" },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
