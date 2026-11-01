import type { Draft } from "@bill-manager/shared";

/**
 * Holds the receipt currently being reviewed, so the scan and detail screens can hand it
 * to the review screen without squeezing it into route params.
 */
let current: Draft | null = null;

export function setDraft(draft: Draft | null): void {
  current = draft;
}

export function getDraft(): Draft | null {
  return current;
}
