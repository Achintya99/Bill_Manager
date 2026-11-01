import type { ExtractedReceipt } from "@bill-manager/shared";

export const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export type ExtractInput = {
  /** Base64-encoded image bytes, without a data: URI prefix. */
  imageBase64: string;
  mediaType: SupportedMediaType;
};

export type ExtractResult = {
  receipt: ExtractedReceipt;
  /** The model that produced the result (may differ from the requested one if a fallback ran). */
  model: string;
};

export interface Extractor {
  extract(input: ExtractInput): Promise<ExtractResult>;
}

/** Thrown when the image could not be turned into a receipt (refusal, unparseable output, etc.). */
export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}
