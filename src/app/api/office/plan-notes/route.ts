import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { checkPlanNote } from "@/lib/office";
import { addPlanNote, deletePlanNote, readPlanNotes } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** "What changed", newest month first. */
export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  return NextResponse.json({ ok: true, notes: await readPlanNotes() });
}

export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const checked = checkPlanNote(b);
  if (!checked.ok) return bad(checked.error);
  return NextResponse.json({ ok: true, note: await addPlanNote(checked.value) }, { status: 201 });
}

export async function DELETE(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const id = Number(new URL(req.url).searchParams.get("id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return bad("Missing id.");
  return (await deletePlanNote(id)) ? NextResponse.json({ ok: true }) : bad("No such line.", 404);
}
