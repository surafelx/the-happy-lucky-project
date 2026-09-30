import { dbConfigured } from "./db.ts";
import { ledgerTotals } from "./office.ts";
import type { InitiativeStatus } from "./office.ts";
import { PLAN_NOTES_SEED, PLAN_SEED } from "../data/plan.ts";
import { readGoals, readInitiatives, readLedger, readPlanNotes } from "./store.ts";

/**
 * The master plan, as anyone may read it.
 *
 * Two rules hold this page honest, and both are structural rather than a promise
 * in the copy:
 *
 *  1. An initiative carries no money of its own. If it is funded, it points at a
 *     goal, and that goal's raised and spent are counted from the public ledger.
 *     So every figure here is one the audit would show, and there is nowhere to
 *     type an encouraging number.
 *  2. A venture can never point at a goal (see `checkInitiative`), so nothing a
 *     venture does can be paid for out of donated money, or look like it was.
 *
 * Without a database the page still renders, from the plan as it was first
 * written down — with no figures and no changelog, and it says so.
 */
export type PlanFunding = { goalId: string; title: string; target: number; raised: number; spent: number; remaining: number; pct: number } | null;
export type PlanItem = {
  id: string;
  title: string;
  kind: "campaign" | "project" | "venture";
  status: InitiativeStatus;
  summary: string;
  detail: string;
  need: string;
  nextStep: string;
  href: string;
  since: string;
  funding: PlanFunding;
  updatedAt: string | null;
};

export async function publicPlan() {
  if (!dbConfigured()) {
    return {
      ok: true as const,
      live: false as const,
      now: new Date().toISOString(),
      updatedAt: null as string | null,
      items: PLAN_SEED.map(
        (p): PlanItem => ({
          id: p.id, title: p.title, kind: p.kind, status: p.status, summary: p.summary, detail: p.detail,
          need: p.need, nextStep: p.nextStep, href: p.href, since: p.since, funding: null, updatedAt: null,
        }),
      ),
      changed: PLAN_NOTES_SEED.map((n, i) => ({ id: -1 - i, month: n.month, text: n.text })),
    };
  }

  const [items, goals, entries, notes] = await Promise.all([readInitiatives(), readGoals(), readLedger(), readPlanNotes()]);
  const totals = ledgerTotals(entries, goals);
  const byGoal = new Map(totals.goals.map((g) => [g.id, g]));

  return {
    ok: true as const,
    live: true as const,
    now: new Date().toISOString(),
    // Not a date somebody types in: the newest thing that actually changed.
    updatedAt:
      [...items.map((i) => i.updatedAt), ...notes.map((n) => n.at)].sort().at(-1) ?? null,
    items: items.map((i): PlanItem => {
      const g = i.goalId ? byGoal.get(i.goalId) ?? null : null;
      return {
        id: i.id, title: i.title, kind: i.kind, status: i.status, summary: i.summary, detail: i.detail,
        need: i.need, nextStep: i.nextStep, href: i.href, since: i.since, updatedAt: i.updatedAt,
        funding: g ? { goalId: g.id, title: g.title, target: g.target, raised: g.raised, spent: g.spent, remaining: g.remaining, pct: g.pct } : null,
      };
    }),
    changed: notes.map((n) => ({ id: n.id, month: n.month, text: n.text })),
  };
}
export type PublicPlan = Awaited<ReturnType<typeof publicPlan>>;
