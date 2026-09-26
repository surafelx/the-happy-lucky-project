import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { checkVisit } from "@/lib/office";
import { createVisit, deleteVisit, readVisits, updateVisit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Every pin on the map, in the order it is listed on the page. */
export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  return NextResponse.json({ ok: true, visits: await readVisits() });
}

/** Adds a pin to the map on /visits. */
export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const checked = checkVisit(b);
  if (!checked.ok) return bad(checked.error);
  return NextResponse.json({ ok: true, visit: await createVisit(checked.value) }, { status: 201 });
}

/** Corrects a pin. The id is the map key and never changes. */
export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = String(b?.id ?? "");
  if (!b || !id) return bad("Missing id.");
  const checked = checkVisit(b);
  if (!checked.ok) return bad(checked.error);
  const visit = await updateVisit(id, checked.value);
  return visit ? NextResponse.json({ ok: true, visit }) : bad("No such place.", 404);
}

/** Takes a pin off the map for good. */
export async function DELETE(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return bad("Missing id.");
  return (await deleteVisit(id)) ? NextResponse.json({ ok: true }) : bad("No such place.", 404);
}
