import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { PLEDGE_STATUSES } from "@/lib/office";
import type { PledgeStatus } from "@/lib/office";
import { updatePledge } from "@/lib/store";

export const runtime = "nodejs";

/** Mark a pledge as received (or back to pledged). */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const id = String(body.id ?? "");
  if (!id || !PLEDGE_STATUSES.includes(body.status as PledgeStatus)) return NextResponse.json({ ok: false, error: "Missing id or status." }, { status: 400 });
  const meta = await updatePledge(id, body.status as PledgeStatus);
  if (!meta) return NextResponse.json({ ok: false, error: "No such pledge." }, { status: 404 });
  return NextResponse.json({ ok: true, meta });
}
