import { z } from "zod";

/**
 * Units a line item can be sold in. "unit" means a countable item (1 pack, 2 bottles).
 */
export const UNITS = ["unit", "kg", "g", "l", "ml"] as const;
export const UnitSchema = z.enum(UNITS);
export type Unit = z.infer<typeof UnitSchema>;

export const PAYMENT_METHODS = ["card", "cash", "other"] as const;

/**
 * One line on a receipt, as read by the extractor.
 * `price` is always the line total actually charged (quantity x unit price, after line discounts).
 */
export const ExtractedItemSchema = z.object({
  name_original: z
    .string()
    .describe("Item text exactly as printed on the receipt, abbreviations included."),
  name_en: z
    .string()
    .describe("Plain English name of the product, abbreviations expanded."),
  quantity: z
    .number()
    .describe("Number of units, or the weight/volume for items sold by weight/volume."),
  unit: UnitSchema.describe('"unit" for countable items; "kg", "g", "l" or "ml" for weighed/measured items.'),
  unit_price: z
    .number()
    .nullable()
    .describe("Price per unit (or per kg/l) if printed or derivable, otherwise null."),
  price: z.number().describe("Line total charged for this item, in the receipt currency."),
  uncertain: z
    .boolean()
    .describe("True if any part of this line was hard to read or the English name is a guess."),
});
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

/**
 * The whole receipt, as read by the extractor. Nullable fields are null when not printed or unreadable.
 */
export const ExtractedReceiptSchema = z.object({
  store: z.string().nullable().describe("Store or brand name as shown to customers (not the legal company name if a trading name is present)."),
  store_address: z.string().nullable(),
  date: z.string().nullable().describe("Purchase date as YYYY-MM-DD."),
  time: z.string().nullable().describe("Purchase time as HH:MM (24h)."),
  total: z.number().nullable().describe("Total amount paid."),
  currency: z.string().describe("ISO 4217 code, e.g. EUR."),
  language: z.string().describe("ISO 639-1 code of the receipt's main language, e.g. es."),
  payment_method: z.enum(PAYMENT_METHODS).nullable(),
  items: z.array(ExtractedItemSchema),
  notes: z
    .string()
    .nullable()
    .describe("Anything the user should know when reviewing, e.g. lines that could not be read. Null if nothing."),
});
export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;

/** Response body of POST /extract on the server. */
export type ExtractResponse = {
  receipt: ExtractedReceipt;
  model: string;
};
