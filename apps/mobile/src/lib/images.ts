import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Longest side of the photo we keep and upload. Large enough for small receipt print,
 * small enough to upload quickly over mobile data (typically well under 1.5 MB as JPEG).
 */
const MAX_SIDE = 2400;

export type PreparedImage = { uri: string; base64: string };

/** Shrinks a picked photo and re-encodes it as JPEG. The result lives in the cache until saved. */
export async function prepareImage(uri: string, width: number, height: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(height >= width ? { height: MAX_SIDE } : { width: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!result.base64) throw new Error("Could not encode the photo.");
  return { uri: result.uri, base64: result.base64 };
}

function receiptsDir(): Directory {
  const dir = new Directory(Paths.document, "receipts");
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Copies a photo into permanent app storage (if it is not there already) and returns its new URI. */
export async function persistImage(uri: string): Promise<string> {
  const dir = receiptsDir();
  if (uri.startsWith(dir.uri)) return uri;
  const target = new File(dir, `receipt-${Date.now()}.jpg`);
  await new File(uri).copy(target);
  return target.uri;
}

/** Deletes a stored photo. Missing files are ignored. */
export function deleteImage(uri: string | null): void {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
