import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { ACTIVITY_KINDS, SUBJECT_KINDS, daysUntil, isoDate } from "@/lib/office";
import type { ActivityKind, SubjectKind } from "@/lib/office";
import { completeReminder, logActivity, markActivitySeen, readActivity } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** The timeline. `?kind=mentor&id=...` narrows to one person; `?open=1` lists reminders still to do. */
export async function GET(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const q = new URL(req.url).searchParams;
  const subjectKind = q.get("kind") as SubjectKind | null;
  const subjectId = q.get("id");
  const today = isoDate(new Date());
  const rows = await readActivity({
    subjectKind: subjectKind && SUBJECT_KINDS.includes(subjectKind) ? subjectKind : undefined,
    subjectId: subjectId ?? undefined,
    open: q.get("open") === "1",
    limit: Math.min(500, Number(q.get("limit")) || 200),
  });
  const openReminders = (await readActivity({ open: true, limit: 500 })).map((a) => ({ ...a, dueIn: a.dueAt ? daysUntil(a.dueAt, today) : null }));
  return NextResponse.json({
    ok: true,
    today,
    unseen: rows.filter((a) => !a.seen).length,
    overdue: openReminders.filter((a) => a.dueIn !== null && a.dueIn < 0).length,
    dueToday: openReminders.filter((a) => a.dueIn === 0).length,
    reminders: openReminders,
    activity: rows.map((a) => ({ ...a, dueIn: a.dueAt ? daysUntil(a.dueAt, today) : null })),
  });
}

/** Log a touch (note, call, email, sms, meeting) or set a reminder for a person. */
export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const subjectKind = b.subjectKind as SubjectKind;
  const kind = b.kind as ActivityKind;
  if (!SUBJECT_KINDS.includes(subjectKind)) return bad("Who is this about?");
  if (!ACTIVITY_KINDS.includes(kind) || kind === "system") return bad("What kind of touch was it?");
  const text = String(b.text ?? "").trim().slice(0, 2000);
  if (!text) return bad("Write a line about it.");
  const dueAt = typeof b.dueAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.dueAt) ? b.dueAt : null;
  if (kind === "reminder" && !dueAt) return bad("A reminder needs a date.");
  const a = await logActivity({ subjectKind, subjectId: String(b.subjectId ?? "").slice(0, 200), subjectName: String(b.subjectName ?? "").trim().slice(0, 160), kind, text, dueAt });
  return NextResponse.json({ ok: true, activity: a }, { status: 201 });
}

/** Tick a reminder off (or back on), or mark everything as seen. */
export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  if (b.seenAll === true) return NextResponse.json({ ok: true, seen: await markActivitySeen() });
  const id = Number(b.id);
  if (!Number.isInteger(id)) return bad("Missing id.");
  const a = await completeReminder(id, b.done !== false);
  if (!a) return bad("No such reminder.", 404);
  return NextResponse.json({ ok: true, activity: a });
}
