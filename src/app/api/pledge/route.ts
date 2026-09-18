import { NextResponse } from "next/server";

import { CAMPAIGN, PLEDGE_TIERS } from "@/data/campaign";
import type { PledgeInput, PledgeTier } from "@/data/campaign";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { pledgeTotals, supplyMath } from "@/lib/office";
import { appendJsonl, readPledges } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Public totals for the progress bar. Names never leave the office. */
export async function GET() {
  if (!MENTOR_FORM_ENABLED) return NextResponse.json({ ok: false }, { status: 404 });
  const math = supplyMath(CAMPAIGN.plan);
  const pledges = process.env.VERCEL ? [] : await readPledges(CAMPAIGN.key);
  return NextResponse.json({ ok: true, ...pledgeTotals(pledges, math.goal, math.perWomanYear), goal: math.goal });
}

/**
 * Records a pledge. No money moves here: the office writes back with how to
 * send it. Same destinations as the other forms, with kind: "pledge".
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

  const math = supplyMath(CAMPAIGN.plan);
  const tier = PLEDGE_TIERS.includes(body.tier as PledgeTier) ? (body.tier as PledgeTier) : null;
  if (!tier) return NextResponse.json({ ok: false, error: "Pick how much you’d like to cover." }, { status: 400 });
  const fixed: Record<PledgeTier, number | null> = {
    "One woman, one month": math.perWomanMonth,
    "One woman, the whole year": math.perWomanYear,
    "Five women, the whole year": math.perWomanYear * 5,
    "My own amount": null,
  };
  const amount = fixed[tier] ?? Math.round(Number(body.amount));
  const record: PledgeInput = {
    name: clean(body.name, 120),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 40),
    tier,
    amount,
    anonymous: body.anonymous === true,
    note: clean(body.note, 1000),
  };
  if (!Number.isFinite(amount) || amount < 10 || amount > 10_000_000) return NextResponse.json({ ok: false, error: "Please enter an amount in birr." }, { status: 400 });
  if (record.name.length < 2) return NextResponse.json({ ok: false, error: "Please tell us your name." }, { status: 400 });
  if (!EMAIL.test(record.email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });

  const at = new Date().toISOString();
  const id = `g-${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { kind: "pledge", at, id, campaign: CAMPAIGN.key, ...record };
  const webhook = (process.env.MENTOR_WEBHOOK_URL ?? process.env.JOIN_WEBHOOK_URL)?.trim();

  const send = async () => {
    const res = await fetch(webhook!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), redirect: "follow" });
    const text = await res.text();
    if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 200)}`);
    if (/"ok"\s*:\s*false|Script function not found|accounts\.google\.com/i.test(text)) throw new Error(`Webhook rejected the request: ${text.slice(0, 200)}`);
  };

  let code = "STORE_FAILED";
  try {
    // Locally the file is the record, so it is written first and a webhook hiccup never loses a pledge.
    if (!process.env.VERCEL) {
      code = "FILE_FAILED";
      await appendJsonl("pledges.jsonl", payload);
    }
    if (webhook) {
      code = "WEBHOOK_FAILED";
      try {
        await send();
      } catch (first) {
        console.warn("[pledge] webhook failed once, retrying:", first);
        try {
          await send(); // Apps Script now and then answers 404 for a moment
        } catch (second) {
          if (process.env.VERCEL) throw second;
          console.error("[pledge] webhook failed twice; kept locally only:", second);
        }
      }
    } else if (process.env.VERCEL) {
      code = "NOT_CONFIGURED";
      throw new Error("No destination configured. Set MENTOR_WEBHOOK_URL or JOIN_WEBHOOK_URL.");
    }
  } catch (err) {
    console.error(`[pledge] ${code}:`, err);
    const detail =
      req.headers.get("x-join-debug") !== null
        ? String(err instanceof Error ? err.message : err).replace(webhook ?? " ", "<webhook>").slice(0, 400)
        : undefined;
    return NextResponse.json({ ok: false, code, error: "Sorry, that didn’t go through on our side. Please try again in a moment.", detail }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id, amount });
}
