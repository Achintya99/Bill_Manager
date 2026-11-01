import { ExtractedReceiptSchema, type ExtractedReceipt } from "@bill-manager/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? "";

/** Reading a long receipt can take a while; give up after two minutes. */
const TIMEOUT_MS = 120_000;

export class ApiError extends Error {}

export function isApiConfigured(): boolean {
  return API_URL !== "";
}

export async function extractReceipt(imageBase64: string): Promise<{ receipt: ExtractedReceipt; model: string }> {
  if (!API_URL) {
    throw new ApiError("The server address is not set. Add EXPO_PUBLIC_API_URL to apps/mobile/.env.local.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/extract`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-token": APP_TOKEN },
      body: JSON.stringify({ image: imageBase64, mediaType: "image/jpeg" }),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new ApiError(
      timedOut
        ? "Reading the receipt took too long. Try again."
        : `Could not reach the server at ${API_URL}. Is it running, and is your phone on the same network?`,
    );
  } finally {
    clearTimeout(timer);
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new ApiError(message ?? `The server returned an error (${res.status}).`);
  }
  const data = body as { receipt?: unknown; model?: unknown } | null;
  const parsed = ExtractedReceiptSchema.safeParse(data?.receipt);
  if (!parsed.success) throw new ApiError("The server sent a receipt in an unexpected format.");
  return { receipt: parsed.data, model: typeof data?.model === "string" ? data.model : "unknown" };
}
