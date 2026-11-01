import { describe, expect, it } from "vitest";
import { RECEIPT_FIXTURES } from "../fixtures";
import {
  ExtractedReceiptSchema,
  checkReceipt,
  formatDate,
  groupByDate,
  isValidIsoDate,
  parseAmount,
  sumAmounts,
} from "./index";

describe("receipt fixtures", () => {
  for (const [name, receipt] of Object.entries(RECEIPT_FIXTURES)) {
    it(`${name} matches the schema`, () => {
      expect(ExtractedReceiptSchema.safeParse(receipt).success).toBe(true);
    });

    it(`${name} items add up to the total and line maths is consistent`, () => {
      const codes = checkReceipt(receipt).map((w) => w.code);
      expect(codes).not.toContain("total_mismatch");
      expect(codes).not.toContain("line_math");
    });
  }

  it("Mercadona VAT bands confirm the price-to-item mapping (21% items = toilet paper + spray)", () => {
    const r = RECEIPT_FIXTURES["mercadona-2026-10-30"];
    const at21 = r.items.filter((i) => ["HIGIENICO DOBLE ROLL", "SPRAY ESSENCE"].includes(i.name_original));
    // Receipt prints 21% base 2.98 + VAT 0.62 = 3.60.
    expect(sumAmounts(at21.map((i) => i.price))).toBe(3.6);
  });
});

describe("checkReceipt", () => {
  const base = {
    store: "Shop",
    date: "2026-11-01",
    total: 3.5,
    currency: "EUR",
    items: [
      { name_original: "A", quantity: 1, unit_price: null, price: 1.2, uncertain: false },
      { name_original: "B", quantity: 2, unit_price: 1.15, price: 2.3, uncertain: false },
    ],
  };

  it("returns no warnings for a consistent receipt", () => {
    expect(checkReceipt(base)).toEqual([]);
  });

  it("flags a total that does not match the items", () => {
    const w = checkReceipt({ ...base, total: 3.6 });
    expect(w.map((x) => x.code)).toEqual(["total_mismatch"]);
    expect(w[0].message).toBe("Items add up to €3.50 but the total is €3.60.");
  });

  it("flags line maths errors beyond 1 cent but tolerates weight rounding", () => {
    const rounding = { ...base, total: 1.37, items: [{ name_original: "PATATA", quantity: 0.722, unit_price: 1.9, price: 1.37, uncertain: false }] };
    expect(checkReceipt(rounding)).toEqual([]);
    const wrong = { ...rounding, total: 1.47, items: [{ ...rounding.items[0], price: 1.47 }] };
    expect(checkReceipt(wrong).map((x) => x.code)).toEqual(["line_math"]);
  });

  it("flags missing fields, invalid dates and uncertain items", () => {
    const w = checkReceipt({ store: " ", date: "2026-02-30", total: null, currency: "EUR", items: [{ name_original: "X", quantity: 1, unit_price: null, price: 1, uncertain: true }] });
    expect(w.map((x) => x.code)).toEqual(["missing_store", "invalid_date", "missing_total", "uncertain_item"]);
    expect(w[3].itemIndex).toBe(0);
  });
});

describe("helpers", () => {
  it("sums money without floating point drift", () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
  });

  it("parses Spanish and English decimal formats", () => {
    expect(parseAmount("1,37")).toBe(1.37);
    expect(parseAmount("€ 20.08")).toBe(20.08);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });

  it("validates ISO dates", () => {
    expect(isValidIsoDate("2026-10-30")).toBe(true);
    expect(isValidIsoDate("30/10/2026")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
  });

  it("formats dates for display", () => {
    expect(formatDate("2026-10-30")).toBe("Fri, 30 Oct 2026");
  });

  it("groups receipts by day, newest first, undated last", () => {
    const groups = groupByDate([
      { id: 1, date: "2026-10-27", total: 10.75 },
      { id: 2, date: "2026-10-30", total: 20.08 },
      { id: 3, date: null, total: 5 },
      { id: 4, date: "2026-10-30", total: 20.59 },
    ]);
    expect(groups.map((g) => [g.date, g.total, g.receipts.map((r) => r.id)])).toEqual([
      ["2026-10-30", 40.67, [2, 4]],
      ["2026-10-27", 10.75, [1]],
      [null, 5, [3]],
    ]);
  });
});
