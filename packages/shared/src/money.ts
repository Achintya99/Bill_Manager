/** Money is handled in integer cents for sums and comparisons, to avoid floating-point drift. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function sumAmounts(amounts: number[]): number {
  return fromCents(amounts.reduce((acc, a) => acc + toCents(a), 0));
}

/** Formats an amount for display, e.g. 20.08 -> "€20.08" (EUR) or "20.08 USD" for other currencies. */
export function formatMoney(amount: number, currency = "EUR"): string {
  const fixed = amount.toFixed(2);
  if (currency === "EUR") return `€${fixed}`;
  return `${fixed} ${currency}`;
}

/**
 * Parses a user-typed amount. Accepts both "1,37" (Spanish) and "1.37".
 * Returns null if the text is not a valid number.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/[€\s]/g, "").replace(",", ".");
  if (cleaned === "" || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
