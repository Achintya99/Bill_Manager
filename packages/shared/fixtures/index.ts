import type { ExtractedReceipt } from "../src/schema";
import mercadona from "./mercadona-2026-10-30.json";
import desiGourmet from "./desi-gourmet-2026-10-30.json";
import spiceBazar from "./spice-bazar-2026-10-27.json";

/**
 * Hand-checked expected extractions of real receipts (the product owner's first three).
 * Keys match the photo file names expected by apps/server/scripts/eval-extraction.ts.
 */
export const RECEIPT_FIXTURES: Record<string, ExtractedReceipt> = {
  "mercadona-2026-10-30": mercadona as ExtractedReceipt,
  "desi-gourmet-2026-10-30": desiGourmet as ExtractedReceipt,
  "spice-bazar-2026-10-27": spiceBazar as ExtractedReceipt,
};
