import type { CheckableReceipt } from "./checks";
import { parseAmount } from "./money";
import type { ExtractedReceipt, Unit } from "./schema";

/**
 * A receipt being reviewed or edited. Numbers are kept as the text the user typed,
 * so half-typed values ("1,") do not jump around while editing.
 */
export type DraftItem = {
  key: string;
  name_original: string;
  name_en: string;
  quantity: string;
  unit: Unit;
  unit_price: string;
  price: string;
  uncertain: boolean;
};

export type Draft = {
  /** Set when editing a saved receipt. */
  id: number | null;
  store: string;
  store_address: string;
  date: string;
  time: string;
  total: string;
  currency: string;
  language: string;
  payment_method: ExtractedReceipt["payment_method"];
  notes: string | null;
  /** Local URI of the receipt photo, if any. */
  image_uri: string | null;
  /** Model that read the receipt, if it was scanned. */
  extraction_model: string | null;
  items: DraftItem[];
};

/** A receipt ready to be stored: all numbers parsed. */
export type ReceiptInput = {
  store: string | null;
  store_address: string | null;
  date: string | null;
  time: string | null;
  total: number | null;
  currency: string;
  language: string;
  payment_method: ExtractedReceipt["payment_method"];
  notes: string | null;
  image_uri: string | null;
  extraction_model: string | null;
  items: {
    name_original: string;
    name_en: string;
    quantity: number;
    unit: Unit;
    unit_price: number | null;
    price: number;
    uncertain: boolean;
  }[];
};

let keyCounter = 0;
export function newItemKey(): string {
  keyCounter += 1;
  return `item-${Date.now().toString(36)}-${keyCounter}`;
}

const numText = (n: number | null): string => (n === null ? "" : String(n));
const textOrNull = (s: string): string | null => (s.trim() === "" ? null : s.trim());

export function emptyDraftItem(): DraftItem {
  return { key: newItemKey(), name_original: "", name_en: "", quantity: "1", unit: "unit", unit_price: "", price: "", uncertain: false };
}

export function draftFromExtracted(r: ExtractedReceipt, imageUri: string | null, model: string | null): Draft {
  return {
    id: null,
    store: r.store ?? "",
    store_address: r.store_address ?? "",
    date: r.date ?? "",
    time: r.time ?? "",
    total: numText(r.total),
    currency: r.currency || "EUR",
    language: r.language || "es",
    payment_method: r.payment_method,
    notes: r.notes,
    image_uri: imageUri,
    extraction_model: model,
    items: r.items.map((i) => ({
      key: newItemKey(),
      name_original: i.name_original,
      name_en: i.name_en,
      quantity: String(i.quantity),
      unit: i.unit,
      unit_price: numText(i.unit_price),
      price: String(i.price),
      uncertain: i.uncertain,
    })),
  };
}

export function emptyDraft(imageUri: string | null = null): Draft {
  return {
    id: null,
    store: "",
    store_address: "",
    date: "",
    time: "",
    total: "",
    currency: "EUR",
    language: "es",
    payment_method: null,
    notes: null,
    image_uri: imageUri,
    extraction_model: null,
    items: [],
  };
}

export function draftFromReceipt(id: number, r: ReceiptInput): Draft {
  const d = draftFromExtracted(
    { ...r, currency: r.currency, language: r.language, items: r.items },
    r.image_uri,
    r.extraction_model,
  );
  return { ...d, id, store_address: r.store_address ?? "" };
}

export type DraftConversion =
  | { ok: true; receipt: ReceiptInput }
  | { ok: false; errors: string[] };

/**
 * Turns a draft into a storable receipt. Fails with readable errors when a number cannot be parsed
 * or an item has no name; other problems (e.g. totals not matching) are warnings, see checkReceipt.
 */
export function draftToReceipt(d: Draft): DraftConversion {
  const errors: string[] = [];
  let total: number | null = null;
  if (d.total.trim() !== "") {
    total = parseAmount(d.total);
    if (total === null) errors.push(`Total "${d.total}" is not a number.`);
  }

  const items = d.items.map((item, index) => {
    const label = item.name_en.trim() || item.name_original.trim() || `Item ${index + 1}`;
    if (!item.name_en.trim() && !item.name_original.trim()) errors.push(`Item ${index + 1} has no name.`);
    const price = parseAmount(item.price);
    if (price === null) errors.push(`"${label}": price "${item.price}" is not a number.`);
    const quantity = parseAmount(item.quantity);
    if (quantity === null || quantity <= 0) errors.push(`"${label}": quantity "${item.quantity}" must be a positive number.`);
    let unitPrice: number | null = null;
    if (item.unit_price.trim() !== "") {
      unitPrice = parseAmount(item.unit_price);
      if (unitPrice === null) errors.push(`"${label}": unit price "${item.unit_price}" is not a number.`);
    }
    return {
      name_original: item.name_original.trim() || item.name_en.trim(),
      name_en: item.name_en.trim() || item.name_original.trim(),
      quantity: quantity ?? 0,
      unit: item.unit,
      unit_price: unitPrice,
      price: price ?? 0,
      uncertain: item.uncertain,
    };
  });

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    receipt: {
      store: textOrNull(d.store),
      store_address: textOrNull(d.store_address),
      date: textOrNull(d.date),
      time: textOrNull(d.time),
      total,
      currency: d.currency,
      language: d.language,
      payment_method: d.payment_method,
      notes: d.notes,
      image_uri: d.image_uri,
      extraction_model: d.extraction_model,
      items,
    },
  };
}

/**
 * Best-effort numeric view of a draft for live warnings while the user is still typing.
 * Unparseable numbers count as 0 so the totals check still runs.
 */
export function draftToCheckable(d: Draft): CheckableReceipt {
  return {
    store: d.store,
    date: textOrNull(d.date),
    total: d.total.trim() === "" ? null : parseAmount(d.total) ?? 0,
    currency: d.currency,
    items: d.items.map((i) => ({
      name_original: i.name_en || i.name_original,
      quantity: parseAmount(i.quantity) ?? 0,
      unit_price: i.unit_price.trim() === "" ? null : parseAmount(i.unit_price),
      price: parseAmount(i.price) ?? 0,
      uncertain: i.uncertain,
    })),
  };
}
