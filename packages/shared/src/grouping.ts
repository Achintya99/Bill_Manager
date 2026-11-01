import { sumAmounts } from "./money";

export type DayGroup<T> = {
  /** YYYY-MM-DD, or null for receipts without a date. */
  date: string | null;
  total: number;
  receipts: T[];
};

/**
 * Groups receipts by purchase date, newest day first, with the day's total.
 * Receipts without a date are collected in a final group with `date: null`.
 */
export function groupByDate<T extends { date: string | null; total: number | null }>(receipts: T[]): DayGroup<T>[] {
  const byDate = new Map<string | null, T[]>();
  for (const r of receipts) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const dates = [...byDate.keys()].filter((d): d is string => d !== null).sort().reverse();
  const groups: DayGroup<T>[] = dates.map((date) => {
    const list = byDate.get(date)!;
    return { date, total: sumAmounts(list.map((r) => r.total ?? 0)), receipts: list };
  });
  const undated = byDate.get(null);
  if (undated) {
    groups.push({ date: null, total: sumAmounts(undated.map((r) => r.total ?? 0)), receipts: undated });
  }
  return groups;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-10-30" -> "Fri, 30 Oct 2026". Returns the input unchanged if it is not YYYY-MM-DD. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${weekday}, ${d} ${MONTHS[mo - 1]} ${y}`;
}
