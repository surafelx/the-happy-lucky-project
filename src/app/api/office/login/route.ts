import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, OFFICE_COOKIE, notAvailable, officeToken, passcodeMatches } from "@/lib/guard";

export const runtime = "nodejs";

/** Office sign-in: the passcode from OFFICE_PASSCODE. With none set, the office is open. */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  const token = officeToken();
  let body: { passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (token && !passcodeMatches(String(body.passcode ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // slows down guessing
    return NextResponse.json({ ok: false, error: "That passcode isn’t right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICE_COOKIE, token ?? "open", { httpOnly: true, sameSite: "lax", secure: Boolean(process.env.VERCEL), path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
