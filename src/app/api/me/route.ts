import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, ME_COOKIE, meEmail, notAvailable } from "@/lib/guard";
import { KIND_LABEL, badgeProgress, onboardingSteps } from "@/lib/office";
import { kidsFor, readMentors, readMessages, readRsvps, readSundays } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The signed-in mentor's dashboard data. */
export async function GET() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  const email = await meEmail();
  if (!email) return NextResponse.json({ ok: false, signedIn: false });
  const mentors = await readMentors();
  const me = mentors.find((m) => m.email === email);
  if (!me) return NextResponse.json({ ok: false, signedIn: false });

  const [sundays, rsvps, messages] = await Promise.all([readSundays(mentors), readRsvps(), readMessages()]);
  const next = sundays[0];
  const club = me.club;
  const mySlot = next.slots.find((s) => s.title.toLowerCase().startsWith(club === "general" ? "homework" : club));
  const hoursWithKids = me.attended.length * 2;

  return NextResponse.json({
    ok: true,
    signedIn: true,
    me: {
      id: me.id,
      name: me.name,
      first: me.name.trim().split(" ")[0],
      email: me.email,
      since: me.at.slice(0, 10),
      status: me.status,
      club,
      share: me.share,
      contribute: me.contribute,
      hasPhoto: Boolean(me.photo),
    },
    steps: onboardingSteps(me.status, me.attended.length),
    badge: badgeProgress(me.status, me.attended.length),
    attended: me.attended,
    hoursWithKids,
    next: {
      date: next.date,
      kind: next.kind,
      kindLabel: KIND_LABEL[next.kind],
      slot: mySlot ?? next.slots[0],
      slots: next.slots,
      rsvp: rsvps[next.date]?.[me.id] ?? null,
      induction: me.status === "contacted",
    },
    upcoming: sundays.slice(1).map((s) => ({ date: s.date, kind: s.kind, kindLabel: KIND_LABEL[s.kind], rsvp: rsvps[s.date]?.[me.id] ?? null })),
    kids: kidsFor(club),
    messages: messages.filter((m) => !m.club || m.club === club),
  });
}

/** Sign in with the email used on the interest form. */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  const me = (await readMentors()).find((m) => m.email === email);
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "We don’t have a mentor form with that email yet. Fill it in first and come back." },
      { status: 404 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ME_COOKIE, encodeURIComponent(email), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ME_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
