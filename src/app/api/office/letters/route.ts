import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { checkLetter } from "@/lib/office";
import { createLetter, deleteLetter, readLetters, updateLetter } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Every letter, drafts included, newest first. */
export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  return NextResponse.json({ ok: true, letters: await readLetters() });
}

/** Writes a new Sunday letter. The slug it is given becomes its address for good. */
export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const checked = checkLetter(b);
  if (!checked.ok) return bad(checked.error);
  try {
    return NextResponse.json({ ok: true, letter: await createLetter(checked.value) }, { status: 201 });
  } catch (err) {
    // The slug is the primary key, so a letter cannot take an address already in use.
    if (String(err).includes("duplicate key")) return bad("There is already a letter at that address.");
    throw err;
  }
}

/** Corrects a letter. The slug is the address, so it is left exactly as it is. */
export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = String(b?.slug ?? "");
  if (!b || !slug) return bad("Missing slug.");
  const checked = checkLetter({ ...b, slug }); // the address cannot be changed by an edit
  if (!checked.ok) return bad(checked.error);
  const letter = await updateLetter(slug, checked.value);
  return letter ? NextResponse.json({ ok: true, letter }) : bad("No such letter.", 404);
}

/** Takes a letter down. Its address stays claimed, so nothing takes it later. */
export async function DELETE(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!slug) return bad("Missing slug.");
  return (await deleteLetter(slug)) ? NextResponse.json({ ok: true }) : bad("No such letter.", 404);
}
