import type { ExtractedItem } from "./schema";
import { formatMoney, sumAmounts, toCents } from "./money";

/** Minimal receipt shape the checks need; both extracted receipts and saved/edited drafts fit it. */
export type CheckableReceipt = {
  store: string | null;
  date: string | null;
  total: number | null;
  currency: string;
  items: Pick<ExtractedItem, "name_original" | "quantity" | "unit_price" | "price" | "uncertain">[];
};

export type ReceiptWarningCode =
  | "missing_store"
  | "missing_date"
  | "invalid_date"
  | "missing_total"
  | "no_items"
  | "total_mismatch"
  | "line_math"
  | "uncertain_item";

export type ReceiptWarning = {
  code: ReceiptWarningCode;
  message: string;
  /** Index into `items` when the warning concerns one line. */
  itemIndex?: number;
};

/** True if `value` is a real calendar date in YYYY-MM-DD form. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Checks a receipt for problems the user should look at during review.
 * Returns an empty list when everything is consistent.
 */
export function checkReceipt(receipt: CheckableReceipt): ReceiptWarning[] {
  const warnings: ReceiptWarning[] = [];
  const cur = receipt.currency;

  if (!receipt.store?.trim()) {
    warnings.push({ code: "missing_store", message: "Store name is missing." });
  }
  if (!receipt.date) {
    warnings.push({ code: "missing_date", message: "Purchase date is missing." });
  } else if (!isValidIsoDate(receipt.date)) {
    warnings.push({ code: "invalid_date", message: `"${receipt.date}" is not a valid date (use YYYY-MM-DD).` });
  }
  if (receipt.total === null) {
    warnings.push({ code: "missing_total", message: "Total is missing." });
  }
  if (receipt.items.length === 0) {
    warnings.push({ code: "no_items", message: "No items were found." });
  }

  if (receipt.total !== null && receipt.items.length > 0) {
    const itemsSum = sumAmounts(receipt.items.map((i) => i.price));
    if (toCents(itemsSum) !== toCents(receipt.total)) {
      warnings.push({
        code: "total_mismatch",
        message: `Items add up to ${formatMoney(itemsSum, cur)} but the total is ${formatMoney(receipt.total, cur)}.`,
      });
    }
  }

  receipt.items.forEach((item, index) => {
    if (item.unit_price !== null) {
      // Weighed items are rounded to the cent, so allow 1 cent of difference.
      const expected = Math.round(item.quantity * item.unit_price * 100);
      if (Math.abs(expected - toCents(item.price)) > 1) {
        warnings.push({
          code: "line_math",
          itemIndex: index,
          message: `"${item.name_original}": ${item.quantity} × ${formatMoney(item.unit_price, cur)} does not equal ${formatMoney(item.price, cur)}.`,
        });
      }
    }
    if (item.uncertain) {
      warnings.push({
        code: "uncertain_item",
        itemIndex: index,
        message: `"${item.name_original}" may have been read or translated incorrectly.`,
      });
    }
  });

  return warnings;
}
