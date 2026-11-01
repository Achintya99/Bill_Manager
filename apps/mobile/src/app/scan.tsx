import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { draftFromExtracted, emptyDraft } from "@bill-manager/shared";
import { Button } from "../components/ui";
import { ApiError, extractReceipt, isApiConfigured } from "../lib/api";
import { setDraft } from "../lib/draft-store";
import { prepareImage, type PreparedImage } from "../lib/images";
import { colors, spacing } from "../lib/theme";

export default function ScanScreen() {
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: "camera" | "library") {
    setError(null);
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera access needed", "Allow camera access in your phone's settings to photograph receipts.");
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const result =
      source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPreparing(true);
    try {
      setImage(await prepareImage(asset.uri, asset.width, asset.height));
    } catch {
      setError("Could not open this photo. Try another one.");
    } finally {
      setPreparing(false);
    }
  }

  async function read() {
    if (!image) return;
    setReading(true);
    setError(null);
    try {
      const { receipt, model } = await extractReceipt(image.base64);
      setDraft(draftFromExtracted(receipt, image.uri, model));
      router.replace("/review");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong while reading the receipt.");
    } finally {
      setReading(false);
    }
  }

  function enterManually() {
    setDraft(emptyDraft(image?.uri ?? null));
    router.replace("/review");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isApiConfigured() && (
        <Text style={styles.error}>
          The server address is not set, so receipts cannot be read automatically. You can still enter them by hand.
        </Text>
      )}
      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel="Receipt photo" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Lay the receipt flat in good light, and fit the whole receipt in the photo.
          </Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {reading ? <Text style={styles.status}>Reading the receipt. This can take up to a minute…</Text> : null}

      <View style={styles.actions}>
        {image && (
          <Button title="Read receipt" onPress={read} loading={reading} disabled={!isApiConfigured()} />
        )}
        <Button
          title={image ? "Retake photo" : "Take photo"}
          variant={image ? "secondary" : "primary"}
          onPress={() => pick("camera")}
          loading={preparing}
          disabled={reading}
        />
        <Button title="Choose from photos" variant="secondary" onPress={() => pick("library")} disabled={reading || preparing} />
        <Button title="Enter by hand" variant="secondary" onPress={enterManually} disabled={reading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  preview: { width: "100%", height: 420, backgroundColor: colors.surface, borderRadius: 12 },
  placeholder: {
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  placeholderText: { color: colors.muted, textAlign: "center", fontSize: 15 },
  actions: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 15 },
  status: { color: colors.muted, fontSize: 15, textAlign: "center" },
});
