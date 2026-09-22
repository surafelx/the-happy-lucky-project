import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { STATUSES } from "@/lib/office";
import type { MentorStatus } from "@/lib/office";
import { crm } from "@/lib/crm";
import { readMentors, updateMentor } from "@/lib/store";

export const runtime = "nodejs";

/** Change a mentor's status, notes, or mark a Sunday attended. */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  let body: { id?: unknown; status?: unknown; notes?: unknown; attended?: { date?: unknown; present?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  const patch: Parameters<typeof updateMentor>[1] = {};
  if (typeof body.status === "string" && STATUSES.includes(body.status as MentorStatus)) patch.status = body.status as MentorStatus;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (body.attended && typeof body.attended.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.attended.date)) {
    patch.attended = { date: body.attended.date, present: Boolean(body.attended.present) };
  }
  const meta = await updateMentor(id, patch);
  if (!meta) return NextResponse.json({ ok: false, error: "No such mentor." }, { status: 404 });
  const who = (await readMentors()).find((m) => m.id === id);
  if (who && patch.status) await crm.changed("mentor", { id, name: who.name }, `Status: ${patch.status}.`);
  if (who && patch.attended) await crm.changed("mentor", { id, name: who.name }, `${patch.attended.present ? "Came" : "Did not come"} on ${patch.attended.date}.`);
  return NextResponse.json({ ok: true, meta });
}
