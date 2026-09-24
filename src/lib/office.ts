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

export const REQUEST_STATUSES = ["new", "contacted", "matched", "done"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_LABEL: Record<RequestStatus, string> = { new: "New", contacted: "Contacted", matched: "Matched", done: "Done" };

/** Which clubs (mentor groups) can answer each kind of request. */
export const NEED_CLUBS: Record<string, string[]> = {
  "One-time workshop": ["coding", "art", "science", "reading", "general"],
  "Regular mentoring": ["coding", "reading", "art", "science", "general"],
  "Homework help": ["general", "science", "reading"],
  "Coding / tech club": ["coding"],
  "Reading club": ["reading"],
  "Art or music": ["art"],
  "Career or university guidance": ["general", "coding", "science"],
  "Educational material": ["reading", "coding", "science", "art"],
  "Help running an event": ["general", "art"],
  "Laptops or equipment": ["coding"],
  "Something else": ["general"],
};

/** Which skills answer a request directly (stronger signal than the club). */
export const NEED_SKILLS: Record<string, string[]> = {
  "Coding / tech club": ["Programming", "Technology"],
  "Laptops or equipment": ["Technology", "Engineering"],
  "Reading club": ["Writing", "Languages"],
  "Art or music": ["Art", "Music"],
  "Career or university guidance": ["Career guidance", "University guidance", "Business", "Entrepreneurship"],
  "Homework help": ["Mathematics", "Science", "Languages"],
  "Educational material": ["Writing", "Programming", "Science", "Art"],
};

/**
 * Ranks the mentor pool for a request. Score: +3 per matching skill, +1 per
 * matching club, +1 if they offered a fitting way to help, +1 if active.
 */
export function suggestMentors<M extends { id: string; share: string[]; contribute: string[]; club: string; status: string }>(
  needs: string[],
  pool: M[],
  limit = 3,
): { mentor: M; score: number; because: string[] }[] {
  const out = pool.map((m) => {
    let score = 0;
    const because: string[] = [];
    for (const n of needs) {
      const skills = (NEED_SKILLS[n] ?? []).filter((s) => m.share.includes(s));
      if (skills.length) {
        score += 3 * skills.length;
        because.push(...skills);
      }
      if ((NEED_CLUBS[n] ?? []).includes(m.club)) score += 1;
      const workshop = /workshop/i.test(n) && m.contribute.some((c) => /workshop/i.test(c));
      const mentoring = /mentoring/i.test(n) && m.contribute.some((c) => /mentor/i.test(c));
      const event = /event/i.test(n) && m.contribute.some((c) => /event/i.test(c));
      const material = /material/i.test(n) && m.contribute.some((c) => /material/i.test(c));
      if (workshop || mentoring || event || material) {
        score += 1;
        because.push(m.contribute.find((c) => /workshop|mentor|event|material/i.test(c)) ?? "");
      }
    }
    if (score > 0 && m.status === "active") score += 1; // a tie-breaker, never a match on its own
    return { mentor: m, score, because: [...new Set(because.filter(Boolean))].slice(0, 3) };
  });
  return out
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------- campaigns ----------
export type SupplyPlan = { women: number; packsPerMonth: number; pricePerPack: number; months: number; bufferPct: number };

/** The arithmetic behind a supply campaign. The buffer covers price rises across the year. */
export function supplyMath(p: SupplyPlan) {
  const withBuffer = (n: number) => Math.ceil((n * (100 + p.bufferPct)) / 100) // integers, so 198 never becomes 199;
  const perWomanMonth = withBuffer(p.packsPerMonth * p.pricePerPack);
  const perWomanYear = perWomanMonth * p.months;
  return {
    packs: p.women * p.packsPerMonth * p.months,
    perWomanMonth,
    perWomanYear,
    goal: perWomanYear * p.women,
  };
}

export const PLEDGE_STATUSES = ["pledged", "sent", "received"] as const; // sent = the giver showed proof, the office has not checked it yet
export const PLEDGE_LABEL: Record<(typeof PLEDGE_STATUSES)[number], string> = { pledged: "Pledged", sent: "Proof sent", received: "Received" };
export type PledgeStatus = (typeof PLEDGE_STATUSES)[number];

/** Pledged counts everything promised; received only what has actually arrived. */
export function pledgeTotals(pledges: { amount: number; status: PledgeStatus }[], goal: number, perWomanYear: number) {
  const pledged = pledges.reduce((s, x) => s + x.amount, 0);
  const received = pledges.filter((x) => x.status === "received").reduce((s, x) => s + x.amount, 0);
  return {
    pledged,
    received,
    count: pledges.length,
    pct: goal > 0 ? Math.min(100, Math.round((pledged / goal) * 100)) : 0,
    womenCovered: perWomanYear > 0 ? Math.floor(pledged / perWomanYear) : 0,
    remaining: Math.max(0, goal - pledged),
  };
}

/** A receipt link from a giver: http(s) only, so nothing clickable in the office can run script. */
export function cleanReceiptLink(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 500 || /\s/.test(text)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text) ? text : `https://${text}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type PledgeFields = { name: string; email: string; phone: string; tier: string; amount: number; anonymous: boolean; note: string };

/**
 * One set of rules for a pledge, wherever it comes from. The public form needs
 * an email (that is how a giver is found again); the office may record a gift
 * from someone who has none.
 */
export function checkPledge(
  raw: Record<string, unknown>,
  tiers: readonly string[],
  opts: { requireEmail: boolean },
): { ok: true; value: PledgeFields } | { ok: false; error: string } {
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const tier = text(raw.tier, 80);
  const amount = Math.round(Number(raw.amount));
  const value: PledgeFields = {
    name: text(raw.name, 120),
    email: text(raw.email, 254).toLowerCase(),
    phone: text(raw.phone, 40),
    tier,
    amount,
    anonymous: raw.anonymous === true,
    note: text(raw.note, 1000),
  };
  if (!tiers.includes(tier)) return { ok: false, error: "Pick how much the pledge covers." };
  if (!Number.isFinite(amount) || amount < 10 || amount > 10_000_000) return { ok: false, error: "Please enter an amount in birr." };
  if (value.name.length < 2) return { ok: false, error: "Please enter a name." };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email);
  if (opts.requireEmail ? !emailOk : value.email !== "" && !emailOk) return { ok: false, error: "Please enter a valid email address." };
  return { ok: true, value };
}

/** 1 -> "1st", 22 -> "22nd", 113 -> "113th". */
export function ordinal(n: number): string {
  const v = Math.abs(Math.trunc(n)) % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : (["th", "st", "nd", "rd"][v % 10] ?? "th");
  return `${Math.trunc(n).toLocaleString("en-US")}${suffix}`;
}

// ---------- supporters and the activity log ----------
export const SUBSCRIPTION_STATUSES = ["pending", "active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = { pending: "Awaiting first payment", active: "Active", paused: "Paused", cancelled: "Cancelled" };

export const ACTIVITY_KINDS = ["system", "note", "call", "email", "sms", "meeting", "reminder"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export const ACTIVITY_ICON: Record<ActivityKind, string> = { system: "\u26a1", note: "\ud83d\udcdd", call: "\ud83d\udcde", email: "\u2709\ufe0f", sms: "\ud83d\udcac", meeting: "\ud83e\udd1d", reminder: "\u23f0" };

export const SUBJECT_KINDS = ["subscriber", "mentor", "partner", "pledge", "subscription"] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];
export const SUBJECT_LABEL: Record<SubjectKind, string> = { subscriber: "Joined the letter", mentor: "Mentor", partner: "Organisation", pledge: "Pledge", subscription: "Supporter" };

/** The same day next month, clamped to the month's length (31 Jan -> 28 Feb). */
export function nextMonth(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return isoDate(target);
}

/** Days from `today` to `due` (negative when overdue). */
export const daysUntil = (due: string, today: string) => Math.round((Date.parse(due + "T12:00:00") - Date.parse(today + "T12:00:00")) / 864e5);

/** A date `days` after `from`, as YYYY-MM-DD. */
export const addDays = (from: Date, days: number) => isoDate(new Date(from.getTime() + days * 864e5));

// ---------- open books: the public ledger and its goals ----------
export const LEDGER_KINDS = ["in", "out", "inkind"] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];
export const LEDGER_METHODS = ["telebirr", "bank", "cash", "other"] as const;
export const METHOD_LABEL: Record<string, string> = { telebirr: "Telebirr", bank: "Bank transfer", cash: "Cash", other: "Other" };
export const GOAL_STATUSES = ["open", "done"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
/** The colours a goal's constellation can take: the brand's, plus two that stay apart from them on the night sky. */
export const GOAL_COLORS = ["#F3BC29", "#E47FC8", "#63B7B9", "#9DD66F", "#FF9B6A", "#A99BFF"] as const;

export type LedgerFields = { kind: LedgerKind; amount: number; name: string; anonymous: boolean; goalId: string | null; method: string; note: string; items: string; recipient: string; occurredAt: string };
export type GoalFields = { title: string; target: number; color: string; about: string; plan: string; status: GoalStatus };

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** One entry in the ledger, from the office form. `now` lets tests pin the clock. */
export function checkLedgerEntry(
  raw: Record<string, unknown>,
  goalIds: readonly string[],
  now = new Date(),
): { ok: true; value: LedgerFields } | { ok: false; error: string } {
  const kind = (LEDGER_KINDS as readonly string[]).includes(String(raw.kind)) ? (String(raw.kind) as LedgerKind) : null;
  if (!kind) return { ok: false, error: "Is this money in, money out, or a gift in kind?" };
  const amount = Math.round(Number(raw.amount));
  if (!Number.isFinite(amount) || amount < 1 || amount > 100_000_000) {
    return { ok: false, error: kind === "inkind" ? "What were the goods worth, in birr?" : "Please enter an amount in birr." };
  }
  const name = text(raw.name, 120);
  if (name.length < 2) return { ok: false, error: kind === "out" ? "Who was it paid to? Enter a name." : "Who gave it? Enter a name." };
  const items = text(raw.items, 200);
  const recipient = text(raw.recipient, 120);
  if (kind === "inkind" && items.length < 2) return { ok: false, error: "What was given? For example “4 packs of 12 diapers”." };
  if (kind === "inkind" && recipient.length < 2) return { ok: false, error: "Who received the goods? Enter a name." };
  const goal = text(raw.goalId, 80);
  if (goal && !goalIds.includes(goal)) return { ok: false, error: "That goal doesn’t exist any more." };
  const method = text(raw.method, 20);
  if (method && !(LEDGER_METHODS as readonly string[]).includes(method)) return { ok: false, error: "Pick how the money moved." };
  const when = raw.occurredAt ? new Date(String(raw.occurredAt)) : now;
  if (Number.isNaN(when.getTime())) return { ok: false, error: "That date doesn’t look right." };
  if (when.getTime() > now.getTime() + 864e5) return { ok: false, error: "That date is in the future." };
  if (when.getFullYear() < 2020) return { ok: false, error: "That date is too far back." };
  return {
    ok: true,
    value: {
      kind,
      amount,
      name,
      anonymous: kind !== "out" && raw.anonymous === true,
      goalId: goal || null,
      method: kind === "inkind" ? "" : method,
      note: text(raw.note, 500),
      items: kind === "inkind" ? items : "",
      recipient: kind === "inkind" ? recipient : "",
      occurredAt: when.toISOString(),
    },
  };
}

export function checkGoal(raw: Record<string, unknown>): { ok: true; value: GoalFields } | { ok: false; error: string } {
  const title = text(raw.title, 80);
  if (title.length < 2) return { ok: false, error: "Give the goal a name." };
  const target = Math.round(Number(raw.target));
  if (!Number.isFinite(target) || target < 0 || target > 1_000_000_000) return { ok: false, error: "Please enter the target in birr." };
  const color = (GOAL_COLORS as readonly string[]).includes(String(raw.color)) ? String(raw.color) : GOAL_COLORS[0];
  const status: GoalStatus = raw.status === "done" ? "done" : "open";
  return { ok: true, value: { title, target, color, about: text(raw.about, 600), plan: text(raw.plan, 1000), status } };
}

/**
 * Everything the numbers on the page come from. The balance is money in minus
 * money out; gifts in kind never touch it, because no money changed hands here.
 * What is still needed counts only open goals, and a goal that has raised more
 * than its target needs nothing (it never goes negative).
 */
export function ledgerTotals<G extends { id: string; target: number; status: GoalStatus }>(
  entries: { kind: LedgerKind; amount: number; goalId: string | null }[],
  goals: G[],
) {
  const sum = (k: LedgerKind, goalId?: string | null) =>
    entries.filter((e) => e.kind === k && (goalId === undefined || e.goalId === goalId)).reduce((s, e) => s + e.amount, 0);
  const moneyIn = sum("in");
  const moneyOut = sum("out");
  const inKind = entries.filter((e) => e.kind === "inkind");
  const perGoal = goals.map((g) => {
    const raised = sum("in", g.id);
    const spent = sum("out", g.id);
    return { ...g, raised, spent, remaining: Math.max(0, g.target - raised), pct: g.target > 0 ? Math.min(100, Math.round((raised / g.target) * 100)) : 0 };
  });
  return {
    in: moneyIn,
    out: moneyOut,
    balance: moneyIn - moneyOut,
    count: entries.length,
    givers: entries.filter((e) => e.kind === "in").length,
    inKind: { value: inKind.reduce((s, e) => s + e.amount, 0), count: inKind.length },
    needed: perGoal.filter((g) => g.status === "open").reduce((s, g) => s + g.remaining, 0),
    general: { raised: sum("in", null), spent: sum("out", null) },
    goals: perGoal,
  };
}
