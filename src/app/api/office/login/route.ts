import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, OFFICE_COOKIE, notAvailable } from "@/lib/guard";

export const runtime = "nodejs";

/** Office sign-in: the passcode from OFFICE_PASSCODE. With none set, the office is open. */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  const pass = process.env.OFFICE_PASSCODE?.trim();
  let body: { passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (pass && String(body.passcode ?? "") !== pass) {
    return NextResponse.json({ ok: false, error: "That passcode isn’t right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICE_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
