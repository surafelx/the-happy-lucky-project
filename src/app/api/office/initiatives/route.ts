import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { checkInitiative } from "@/lib/office";
import { createInitiative, deleteInitiative, readGoals, readInitiatives, updateInitiative } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Everything on the master plan, plus the goals one can be funded by. */
export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  const [initiatives, goals] = await Promise.all([readInitiatives(), readGoals()]);
  return NextResponse.json({ ok: true, initiatives, goals: goals.map((g) => ({ id: g.id, title: g.title })) });
}

export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const checked = checkInitiative(b);
  if (!checked.ok) return bad(checked.error);
  return NextResponse.json({ ok: true, initiative: await createInitiative(checked.value) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = String(b?.id ?? "");
  if (!b || !id) return bad("Missing id.");
  const checked = checkInitiative(b);
  if (!checked.ok) return bad(checked.error);
  const initiative = await updateInitiative(id, checked.value);
  return initiative ? NextResponse.json({ ok: true, initiative }) : bad("No such thing on the plan.", 404);
}

export async function DELETE(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return bad("Missing id.");
  return (await deleteInitiative(id)) ? NextResponse.json({ ok: true }) : bad("No such thing on the plan.", 404);
}
