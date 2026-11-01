import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { migrate } from "../lib/db";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="receipts.db" onInit={migrate}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Receipts" }} />
        <Stack.Screen name="scan" options={{ title: "Scan receipt" }} />
        <Stack.Screen name="review" options={{ title: "Review receipt" }} />
        <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
      </Stack>
    </SQLiteProvider>
  );
}
