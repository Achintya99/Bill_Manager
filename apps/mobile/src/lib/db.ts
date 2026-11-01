import type { SQLiteDatabase } from "expo-sqlite";
import { fromCents, toCents, type ReceiptInput, type Unit } from "@bill-manager/shared";

/**
 * Local storage for receipts. Amounts are stored as integer cents so later spend
 * aggregations (Milestone 2) can be done exactly in SQL.
 */
const MIGRATIONS: string[] = [
  // v1: receipts with line items.
  `
  CREATE TABLE receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store TEXT,
    store_address TEXT,
    date TEXT,
    time TEXT,
    total_cents INTEGER,
    currency TEXT NOT NULL DEFAULT 'EUR',
    language TEXT NOT NULL DEFAULT 'es',
    payment_method TEXT,
    notes TEXT,
    image_uri TEXT,
    extraction_model TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_receipts_date ON receipts(date);
  CREATE TABLE receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name_original TEXT NOT NULL,
    name_en TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    unit_price_cents INTEGER,
    price_cents INTEGER NOT NULL,
    uncertain INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_items_receipt ON receipt_items(receipt_id);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

export type ReceiptSummary = {
  id: number;
  store: string | null;
  date: string | null;
  time: string | null;
  total: number | null;
  currency: string;
  item_count: number;
};

export type SavedReceipt = ReceiptInput & { id: number; created_at: string; updated_at: string };

type ReceiptRow = {
  id: number;
  store: string | null;
  store_address: string | null;
  date: string | null;
  time: string | null;
  total_cents: number | null;
  currency: string;
  language: string;
  payment_method: ReceiptInput["payment_method"];
  notes: string | null;
  image_uri: string | null;
  extraction_model: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  name_original: string;
  name_en: string;
  quantity: number;
  unit: Unit;
  unit_price_cents: number | null;
  price_cents: number;
  uncertain: number;
};

const centsOrNull = (n: number | null) => (n === null ? null : toCents(n));
const amountOrNull = (n: number | null) => (n === null ? null : fromCents(n));

export async function listReceipts(db: SQLiteDatabase): Promise<ReceiptSummary[]> {
  const rows = await db.getAllAsync<Omit<ReceiptSummary, "total"> & { total_cents: number | null }>(
    `SELECT r.id, r.store, r.date, r.time, r.total_cents, r.currency,
            (SELECT COUNT(*) FROM receipt_items i WHERE i.receipt_id = r.id) AS item_count
       FROM receipts r
      ORDER BY r.date DESC, r.time DESC, r.id DESC`,
  );
  return rows.map(({ total_cents, ...r }) => ({ ...r, total: amountOrNull(total_cents) }));
}

export async function getReceipt(db: SQLiteDatabase, id: number): Promise<SavedReceipt | null> {
  const row = await db.getFirstAsync<ReceiptRow>("SELECT * FROM receipts WHERE id = ?", id);
  if (!row) return null;
  const items = await db.getAllAsync<ItemRow>(
    "SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY position",
    id,
  );
  const { total_cents, ...rest } = row;
  return {
    ...rest,
    total: amountOrNull(total_cents),
    items: items.map((i) => ({
      name_original: i.name_original,
      name_en: i.name_en,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: amountOrNull(i.unit_price_cents),
      price: fromCents(i.price_cents),
      uncertain: i.uncertain === 1,
    })),
  };
}

/** Inserts a new receipt (id null) or replaces an existing one. Returns the receipt id. */
export async function saveReceipt(db: SQLiteDatabase, r: ReceiptInput, id: number | null): Promise<number> {
  const now = new Date().toISOString();
  let receiptId = id;
  await db.withTransactionAsync(async () => {
    const values = [
      r.store, r.store_address, r.date, r.time, centsOrNull(r.total), r.currency, r.language,
      r.payment_method, r.notes, r.image_uri, r.extraction_model,
    ];
    if (receiptId === null) {
      const result = await db.runAsync(
        `INSERT INTO receipts (store, store_address, date, time, total_cents, currency, language,
           payment_method, notes, image_uri, extraction_model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...values, now, now],
      );
      receiptId = result.lastInsertRowId;
    } else {
      await db.runAsync(
        `UPDATE receipts SET store = ?, store_address = ?, date = ?, time = ?, total_cents = ?, currency = ?,
           language = ?, payment_method = ?, notes = ?, image_uri = ?, extraction_model = ?, updated_at = ?
         WHERE id = ?`,
        [...values, now, receiptId],
      );
      await db.runAsync("DELETE FROM receipt_items WHERE receipt_id = ?", receiptId);
    }
    for (const [position, item] of r.items.entries()) {
      await db.runAsync(
        `INSERT INTO receipt_items (receipt_id, position, name_original, name_en, quantity, unit,
           unit_price_cents, price_cents, uncertain)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [receiptId, position, item.name_original, item.name_en, item.quantity, item.unit,
          centsOrNull(item.unit_price), toCents(item.price), item.uncertain ? 1 : 0],
      );
    }
  });
  return receiptId!;
}

export async function deleteReceipt(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM receipts WHERE id = ?", id);
}
