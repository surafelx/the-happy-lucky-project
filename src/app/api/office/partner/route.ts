import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { REQUEST_STATUSES } from "@/lib/office";
import type { RequestStatus } from "@/lib/office";
import { updatePartner } from "@/lib/store";

export const runtime = "nodejs";

/** Move an organisation's request along, keep notes, or match a mentor to it. */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  let body: { id?: unknown; status?: unknown; notes?: unknown; match?: { mentorId?: unknown; on?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  const patch: Parameters<typeof updatePartner>[1] = {};
  if (typeof body.status === "string" && REQUEST_STATUSES.includes(body.status as RequestStatus)) patch.status = body.status as RequestStatus;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (body.match && typeof body.match.mentorId === "string") patch.match = { mentorId: body.match.mentorId, on: Boolean(body.match.on) };
  const meta = await updatePartner(id, patch);
  if (!meta) return NextResponse.json({ ok: false, error: "No such request." }, { status: 404 });
  return NextResponse.json({ ok: true, meta });
}
