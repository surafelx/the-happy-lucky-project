import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { checkGoal } from "@/lib/office";
import { createGoal, updateGoal } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** A new goal: what the money is for, how much, and the plan. */
export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const checked = checkGoal(b);
  if (!checked.ok) return bad(checked.error);
  return NextResponse.json({ ok: true, goal: await createGoal(checked.value) }, { status: 201 });
}

/** Edit a goal, or mark it done (`status: "done"`). */
export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = String(b?.id ?? "");
  if (!b || !id) return bad("Missing id.");
  const checked = checkGoal(b);
  if (!checked.ok) return bad(checked.error);
  const goal = await updateGoal(id, checked.value);
  return goal ? NextResponse.json({ ok: true, goal }) : bad("No such goal.", 404);
}
