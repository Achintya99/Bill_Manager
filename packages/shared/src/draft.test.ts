import { describe, expect, it } from "vitest";
import { RECEIPT_FIXTURES } from "../fixtures";
import { checkReceipt, draftFromExtracted, draftFromReceipt, draftToCheckable, draftToReceipt, emptyDraftItem } from "./index";

const mercadona = RECEIPT_FIXTURES["mercadona-2026-10-30"];

describe("drafts", () => {
  it("round-trips an extracted receipt without losing data", () => {
    const draft = draftFromExtracted(mercadona, "file:///photo.jpg", "claude-opus-5-5");
    const result = draftToReceipt(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.total).toBe(20.08);
    expect(result.receipt.items).toEqual(mercadona.items);
    expect(result.receipt.image_uri).toBe("file:///photo.jpg");

    const again = draftToReceipt(draftFromReceipt(7, result.receipt));
    expect(again.ok && again.receipt).toEqual(result.receipt);
  });

  it("accepts Spanish decimal commas typed by the user", () => {
    const draft = draftFromExtracted(mercadona, null, null);
    draft.total = "20,08";
    draft.items[13].price = "1,37";
    const result = draftToReceipt(draft);
    expect(result.ok && result.receipt.items[13].price).toBe(1.37);
  });

  it("reports unparseable numbers and nameless items", () => {
    const draft = draftFromExtracted(mercadona, null, null);
    draft.total = "twenty";
    draft.items.push({ ...emptyDraftItem(), price: "" });
    const result = draftToReceipt(draft);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'Total "twenty" is not a number.',
      "Item 16 has no name.",
      '"Item 16": price "" is not a number.',
    ]);
  });

  it("produces live warnings while editing", () => {
    const draft = draftFromExtracted(mercadona, null, null);
    draft.items[0].price = "2,50";
    const codes = checkReceipt(draftToCheckable(draft)).map((w) => w.code);
    expect(codes).toContain("total_mismatch");
  });
});
