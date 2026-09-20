import { NextResponse } from "next/server";

import { ME_ENABLED, meEmail, notAvailable } from "@/lib/guard";
import { readMentors, setRsvp } from "@/lib/store";

export const runtime = "nodejs";

/** "I'll be there" / "Can't make it" for a Sunday. */
export async function POST(req: Request) {
  if (!ME_ENABLED) return notAvailable();
  const email = await meEmail();
  const me = email ? (await readMentors()).find((m) => m.email === email) : undefined;
  if (!me) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  let body: { date?: unknown; answer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const date = String(body.date ?? "");
  const answer = body.answer === "yes" ? "yes" : body.answer === "no" ? "no" : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !answer) return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  await setRsvp(date, me.id, answer);
  return NextResponse.json({ ok: true, date, answer });
}
