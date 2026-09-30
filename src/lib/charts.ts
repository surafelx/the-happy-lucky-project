import type { LedgerKind } from "./office.ts";

/**
 * The arithmetic behind the audit page's charts. Pure, so it can be tested
 * without a database or a browser.
 *
 * Only cash counts here. A gift in kind never passed through our hands, so it
 * is not money in and not money out; it gets its own block on the page.
 */
export type Entry = { kind: LedgerKind; amount: number; occurredAt: string };
export type MonthFlow = { key: string; label: string; in: number; out: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The last `count` months up to `now`, oldest first, each with what came in and
 * what went out. Empty months are kept: a gap in giving is worth seeing.
 */
export function monthlyFlow(entries: Entry[], now: Date, count = 6): MonthFlow[] {
  const months: MonthFlow[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTHS[d.getMonth()], in: 0, out: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const e of entries) {
    if (e.kind !== "in" && e.kind !== "out") continue;
    const d = new Date(e.occurredAt);
    const m = byKey.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    if (m) m[e.kind] += e.amount;
  }
  return months;
}

/** The tallest bar in the chart, never zero, so a bar's height is always a real fraction of it. */
export const tallest = (months: MonthFlow[]): number => Math.max(1, ...months.map((m) => Math.max(m.in, m.out)));

/**
 * What the money is doing right now, as parts of one whole: everything given is
 * either spent or still here. Percentages are rounded so they still add to 100,
 * because two numbers that say 49 and 50 under a "100%" bar look like a bug.
 */
export function standing(moneyIn: number, moneyOut: number): { spent: number; held: number; spentPct: number; heldPct: number } {
  const held = Math.max(0, moneyIn - moneyOut);
  if (moneyIn <= 0) return { spent: moneyOut, held, spentPct: 0, heldPct: 0 };
  const spentPct = Math.min(100, Math.round((moneyOut / moneyIn) * 100));
  return { spent: moneyOut, held, spentPct, heldPct: 100 - spentPct };
}
