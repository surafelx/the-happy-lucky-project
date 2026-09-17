/**
 * Pure logic for the dashboards. No Next.js, no filesystem, so it is
 * unit-testable with `node --test` (see tests/office.test.ts).
 */

export const STATUSES = ["new", "contacted", "inducted", "active"] as const;
export type MentorStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<MentorStatus, string> = {
  new: "New",
  contacted: "Contacted",
  inducted: "Inducted",
  active: "Active",
};

export type SundayKind = "workshop" | "pairing" | "launch" | "showcase";

export const KIND_LABEL: Record<SundayKind, string> = {
  workshop: "Kids' workshops",
  pairing: "Big sibling pairing",
  launch: "Campaign launch",
  showcase: "Impact showcase",
};

/** ISO date (YYYY-MM-DD) in local time. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The Sundays of a month, as day numbers. */
export function sundaysOfMonth(year: number, month: number): number[] {
  const out: number[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= last; i++) if (new Date(year, month, i).getDay() === 0) out.push(i);
  return out;
}

/** First Sunday = pairing, third = launch, last = showcase, otherwise workshops. */
export function sundayKind(d: Date): SundayKind {
  const s = sundaysOfMonth(d.getFullYear(), d.getMonth());
  const i = s.indexOf(d.getDate());
  if (i === 0) return "pairing";
  if (i === 2) return "launch";
  if (i === s.length - 1) return "showcase";
  return "workshop";
}

/** The next `n` Sundays from `from` (inclusive if `from` is a Sunday). */
export function nextSundays(from: Date, n: number): Date[] {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - shift);
  return x;
}

/** Counts per calendar week for the last `weeks` weeks ending in the week of `now`. */
export function weeklyCounts(dates: Date[], now: Date, weeks: number): { week: string; count: number }[] {
  const start = weekStart(now);
  start.setDate(start.getDate() - 7 * (weeks - 1));
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const w = new Date(start);
    w.setDate(start.getDate() + 7 * i);
    return { week: isoDate(w), count: 0 };
  });
  for (const d of dates) {
    const idx = Math.floor((weekStart(d).getTime() - start.getTime()) / (7 * 864e5));
    if (idx >= 0 && idx < weeks) buckets[idx].count++;
  }
  return buckets;
}

/** How many people offered each skill, most first. */
export function skillCounts(pool: { share: string[] }[]): { skill: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of pool) for (const s of p.share) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}

export type Step = { key: string; label: string; done: boolean; current: boolean };

/** The onboarding checklist, derived from status plus attendance. */
export function onboardingSteps(status: MentorStatus, attended: number): Step[] {
  const rank = STATUSES.indexOf(status);
  const done = [
    true, // interest form
    rank >= 1, // safety policy sent & signed once contacted
    rank >= 2, // reference check clears before induction
    rank >= 2, // induction
    rank >= 3 || attended > 0, // first Sunday
  ];
  const labels = ["Interest form", "Safety policy read & signed", "Reference check", "Induction at the centre", "First Sunday with kids"];
  const keys = ["form", "policy", "reference", "induction", "first"];
  let currentSet = false;
  return labels.map((label, i) => {
    const current = !done[i] && !currentSet;
    if (current) currentSet = true;
    return { key: keys[i], label, done: done[i], current };
  });
}

/** Badge: induction plus four Sundays. Returns steps completed out of 5. */
export function badgeProgress(status: MentorStatus, attended: number): { done: number; total: number; unlocked: boolean } {
  const inducted = STATUSES.indexOf(status) >= 2 ? 1 : 0;
  const done = Math.min(5, inducted + Math.min(4, attended));
  return { done, total: 5, unlocked: done >= 5 };
}

/** Which club a mentor lands in, from what they offered. */
export function clubFor(share: string[]): "coding" | "reading" | "art" | "science" | "general" {
  const has = (s: string) => share.includes(s);
  if (has("Programming") || has("Technology")) return "coding";
  if (has("Writing") || has("Languages")) return "reading";
  if (has("Art") || has("Music")) return "art";
  if (has("Science") || has("Mathematics") || has("Engineering") || has("Medicine")) return "science";
  return "general";
}

/** A short receipt number: HLP-YYMM-NNNN. */
export function receiptId(date: Date, seq: number): string {
  return `HLP-${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}-${String(seq).padStart(4, "0")}`;
}
