import { NextResponse } from "next/server";

import { CAMPAIGN, PLEDGE_TIERS } from "@/data/campaign";
import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { PLEDGE_STATUSES, checkPledge, pledgeTotals, supplyMath } from "@/lib/office";
import type { PledgeStatus } from "@/lib/office";
import { createPledge, deletePledge, editPledge, readPledges } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pledges, for the office: list, add (a gift handed over in person never went
 * through the public form), edit, and delete. One resource, four verbs.
 */
async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const asStatus = (v: unknown): PledgeStatus | null => (PLEDGE_STATUSES.includes(v as PledgeStatus) ? (v as PledgeStatus) : null);

async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = (await req.json()) as unknown;
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  const math = supplyMath(CAMPAIGN.plan);
  const pledges = await readPledges(CAMPAIGN.key);
  return NextResponse.json({
    ok: true,
    campaign: { key: CAMPAIGN.key, title: CAMPAIGN.title, home: CAMPAIGN.home, confirmed: CAMPAIGN.confirmed, plan: CAMPAIGN.plan, math, tiers: PLEDGE_TIERS },
    totals: pledgeTotals(pledges, math.goal, math.perWomanYear),
    pledges: pledges.map((p) => ({
      id: p.id,
      at: p.at,
      source: p.source ?? "site",
      name: p.name,
      email: p.email,
      phone: p.phone,
      tier: p.tier,
      amount: p.amount,
      anonymous: p.anonymous,
      note: p.note,
      status: p.status,
      updatedAt: p.updatedAt,
      proof: p.proof ? { link: p.proof.link, ref: p.proof.ref, at: p.proof.at, image: p.proof.image ? `/api/office/proof?id=${encodeURIComponent(p.id)}` : null } : null,
    })),
  });
}

export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = await body(req);
  if (!b) return bad("Bad request.");
  const checked = checkPledge(b, PLEDGE_TIERS, { requireEmail: false });
  if (!checked.ok) return bad(checked.error);
  const pledge = await createPledge(CAMPAIGN.key, checked.value, asStatus(b.status) ?? "pledged");
  return NextResponse.json({ ok: true, id: pledge.id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = await body(req);
  const id = String(b?.id ?? "");
  if (!b || !id) return bad("Missing id.");
  const current = (await readPledges()).find((p) => p.id === id);
  if (!current) return bad("No such pledge.", 404);

  const status = b.status === undefined ? undefined : asStatus(b.status);
  if (status === null) return bad("Unknown status.");
  const touchesFields = ["name", "email", "phone", "tier", "amount", "anonymous", "note"].some((k) => k in b);
  let fields;
  if (touchesFields) {
    const checked = checkPledge({ ...current, ...b }, PLEDGE_TIERS, { requireEmail: false });
    if (!checked.ok) return bad(checked.error);
    fields = checked.value;
  }
  const meta = await editPledge(id, { fields, status });
  return NextResponse.json({ ok: true, meta });
}

export async function DELETE(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return bad("Missing id.");
  const done = await deletePledge(id);
  if (!done) return bad("No such pledge.", 404);
  return NextResponse.json({ ok: true });
}
