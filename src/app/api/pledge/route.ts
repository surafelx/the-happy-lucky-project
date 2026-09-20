import { NextResponse } from "next/server";

import { CAMPAIGN, PLEDGE_TIERS } from "@/data/campaign";
import type { PledgeInput, PledgeTier } from "@/data/campaign";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { checkPledge, pledgeTotals, supplyMath } from "@/lib/office";
import { dbConfigured } from "@/lib/db";
import { deliver } from "@/lib/intake";
import { createPledge, readPledges } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/** Public totals for the progress bar. Names never leave the office. */
export async function GET() {
  if (!MENTOR_FORM_ENABLED) return NextResponse.json({ ok: false }, { status: 404 });
  const math = supplyMath(CAMPAIGN.plan);
  const pledges = dbConfigured() ? await readPledges(CAMPAIGN.key) : [];
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
  const checked = checkPledge({ ...body, tier, amount: fixed[tier] ?? body.amount }, PLEDGE_TIERS, { requireEmail: true });
  if (!checked.ok) return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });
  const record = checked.value as PledgeInput;
  const amount = record.amount;

  const at = new Date().toISOString();
  const id = `g-${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { kind: "pledge", at, id, campaign: CAMPAIGN.key, source: "site", ...record };
  const webhook = (process.env.MENTOR_WEBHOOK_URL ?? process.env.JOIN_WEBHOOK_URL)?.trim();

  const failed = await deliver({ tag: "pledge", req, payload, webhook, save: () => createPledge(CAMPAIGN.key, checked.value, "pledged", "site", at, id) });
  if (failed) return failed;

  return NextResponse.json({ ok: true, id, amount });
}
