import { dbConfigured } from "./db.ts";
import { MENTOR_FORM_ENABLED } from "./flags.ts";
import { METHOD_LABEL, ledgerTotals } from "./office.ts";
import { readGoals, readLedger } from "./store.ts";

/** The audit page is public, so it needs the feature on and somewhere real to read from. */
export const booksEnabled = () => MENTOR_FORM_ENABLED && dbConfigured();

/**
 * What anyone may see: amounts, dates, who gave (unless they asked not to be
 * named), what it was for, and whether a receipt is published. The ledger
 * stores no contact details, so none can leak from it.
 */
export async function publicBooks() {
  const [entries, goals] = await Promise.all([readLedger(), readGoals()]);
  const totals = ledgerTotals(entries, goals);
  return {
    ok: true as const,
    now: new Date().toISOString(),
    totals: {
      in: totals.in,
      out: totals.out,
      balance: totals.balance,
      count: totals.count,
      givers: totals.givers,
      needed: totals.needed,
      inKind: totals.inKind,
      general: totals.general,
      verified: { count: entries.filter((e) => e.verify.state === "verified").length, amount: entries.filter((e) => e.verify.state === "verified").reduce((s, e) => s + e.amount, 0) },
    },
    goals: totals.goals.map((g) => ({ id: g.id, title: g.title, color: g.color, target: g.target, about: g.about, plan: g.plan, status: g.status, raised: g.raised, spent: g.spent, remaining: g.remaining, pct: g.pct })),
    entries: entries.map((e) => ({
      ref: e.ref,
      kind: e.kind,
      amount: e.amount,
      name: e.anonymous ? "Anonymous" : e.name,
      goalId: e.goalId,
      method: METHOD_LABEL[e.method] ?? "",
      note: e.note,
      items: e.items,
      recipient: e.recipient,
      occurredAt: e.occurredAt,
      loggedAt: e.at,
      receipt: Boolean(e.receipt),
      photo: e.photo,
      // Whether a bank confirmed it, and which bank. The receipt link is a credential
      // and stays in the office; the bank's own reference could rebuild that link, so it stays too.
      verified: e.verify.state === "verified",
      verifiedBy: e.verify.state === "verified" ? e.verify.provider : "",
      verifiedAt: e.verify.state === "verified" ? e.verify.at : null,
    })),
  };
}
export type PublicBooks = Awaited<ReturnType<typeof publicBooks>>;
