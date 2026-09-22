import { NextResponse } from "next/server";

import { SUPPORT_PLANS, planByKey } from "@/data/support";
import { crm } from "@/lib/crm";
import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { SUBSCRIPTION_LABEL, SUBSCRIPTION_STATUSES, daysUntil, isoDate } from "@/lib/office";
import type { SubscriptionStatus } from "@/lib/office";
import { createSubscription, readSubscription, readSubscriptions, recordSubscriptionPayment, updateSubscription } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Supporters, with how many days until each is due and the monthly total the active ones add up to. */
export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  const today = isoDate(new Date());
  const subs = await readSubscriptions();
  const active = subs.filter((s) => s.status === "active");
  return NextResponse.json({
    ok: true,
    today,
    plans: SUPPORT_PLANS,
    totals: {
      active: active.length,
      pending: subs.filter((s) => s.status === "pending").length,
      monthly: active.reduce((t, s) => t + s.amount, 0),
      due: active.filter((s) => s.nextDue && daysUntil(s.nextDue, today) <= 0).length,
    },
    subscriptions: subs.map((s) => ({ ...s, planName: planByKey(s.plan)?.name ?? s.plan, dueIn: s.nextDue ? daysUntil(s.nextDue, today) : null, statusLabel: SUBSCRIPTION_LABEL[s.status] })),
  });
}

/** The office adds a supporter who arranged it in person. */
export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const plan = planByKey(String(b.plan ?? ""));
  if (!plan) return bad("Pick a plan.");
  const name = String(b.name ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 254);
  if (name.length < 2) return bad("Please enter a name.");
  if (email && !EMAIL.test(email)) return bad("Please enter a valid email address.");
  const sub = await createSubscription({ name, email, phone: String(b.phone ?? "").trim().slice(0, 40), plan: plan.key, amount: plan.amount, method: b.method === "bank" ? "bank" : "telebirr", anonymous: b.anonymous === true, note: String(b.note ?? "").trim().slice(0, 1000) });
  await crm.changed("subscription", sub, `Added by the office on the ${plan.name} plan.`);
  return NextResponse.json({ ok: true, id: sub.id }, { status: 201 });
}

/** Change status, edit details, or record this month's payment (`paid: true`). */
export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = String(b?.id ?? "");
  if (!b || !id) return bad("Missing id.");
  const cur = await readSubscription(id);
  if (!cur) return bad("No such supporter.", 404);

  if (b.paid === true) {
    const sub = await recordSubscriptionPayment(id);
    await crm.changed("subscription", cur, `Month ${sub?.paidMonths} received (${cur.amount.toLocaleString("en-US")} birr). Next due ${sub?.nextDue}.`);
    return NextResponse.json({ ok: true, subscription: sub });
  }
  const status = b.status === undefined ? undefined : SUBSCRIPTION_STATUSES.includes(b.status as SubscriptionStatus) ? (b.status as SubscriptionStatus) : null;
  if (status === null) return bad("Unknown status.");
  const fields: Record<string, unknown> = {};
  for (const k of ["name", "email", "phone", "note"] as const) if (typeof b[k] === "string") fields[k] = (b[k] as string).trim().slice(0, k === "note" ? 1000 : 254);
  if (typeof b.plan === "string") {
    const plan = planByKey(b.plan);
    if (!plan) return bad("Unknown plan.");
    fields.plan = plan.key;
    fields.amount = plan.amount;
  }
  if (typeof b.anonymous === "boolean") fields.anonymous = b.anonymous;
  if (b.method === "bank" || b.method === "telebirr") fields.method = b.method;
  if (typeof fields.email === "string" && fields.email && !EMAIL.test(fields.email)) return bad("Please enter a valid email address.");
  const sub = await updateSubscription(id, { status, fields });
  if (status && status !== cur.status) await crm.changed("subscription", cur, `Status: ${SUBSCRIPTION_LABEL[status]}.`);
  return NextResponse.json({ ok: true, subscription: sub });
}
