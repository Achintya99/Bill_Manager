import { RECEIPT_FIXTURES } from "@bill-manager/shared/fixtures";
import type { Extractor } from "./types";

/** Returns a real sample receipt without calling any API. For UI development and tests. */
export function createMockExtractor(fixture = "mercadona-2026-10-30"): Extractor {
  const receipt = RECEIPT_FIXTURES[fixture];
  if (!receipt) throw new Error(`Unknown fixture "${fixture}"`);
  return {
    async extract() {
      return { receipt: structuredClone(receipt), model: "mock" };
    },
  };
}
