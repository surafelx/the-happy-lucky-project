import { NextResponse } from "next/server";

import { PAY_METHODS, SUPPORT_PLANS, planByKey } from "@/data/support";
import type { PayMethod } from "@/data/support";
import { crm } from "@/lib/crm";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { deliver } from "@/lib/intake";
import { createSubscription } from "@/lib/store";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * A monthly supporter signs up for a plan. No money moves here: the office
 * writes with payment details and confirms each month by hand.
 */
export async function POST(req: Request) {
  if (!MENTOR_FORM_ENABLED) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const plan = planByKey(String(body.plan ?? ""));
  if (!plan) return NextResponse.json({ ok: false, error: `Pick a plan: ${SUPPORT_PLANS.map((p) => p.name).join(", ")}.` }, { status: 400 });
  const method = PAY_METHODS.includes(body.method as PayMethod) ? (body.method as PayMethod) : "telebirr";
  const fields = {
    name: clean(body.name, 120),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 40),
    plan: plan.key,
    amount: plan.amount,
    method,
    anonymous: body.anonymous === true,
    note: clean(body.note, 1000),
  };
  if (fields.name.length < 2) return NextResponse.json({ ok: false, error: "Please tell us your name." }, { status: 400 });
  if (!EMAIL.test(fields.email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });

  const at = new Date().toISOString();
  const id = `s-${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { kind: "support", at, id, ...fields };
  const webhook = (process.env.MENTOR_WEBHOOK_URL ?? process.env.JOIN_WEBHOOK_URL)?.trim();

  const failed = await deliver({
    tag: "support",
    req,
    payload,
    webhook,
    save: async () => {
      await createSubscription(fields, at, id);
      await crm.subscribed({ id, name: fields.name }, plan.name, plan.amount);
    },
  });
  if (failed) return failed;
  return NextResponse.json({ ok: true, id, plan: plan.name, amount: plan.amount });
}
