import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";

/** Dashboards are part of the flagged feature; off in production until NEXT_PUBLIC_MENTOR_FORM=1. */
export const DASHBOARDS_ENABLED = MENTOR_FORM_ENABLED && !process.env.VERCEL;

export const OFFICE_COOKIE = "hlp_office";
export const ME_COOKIE = "hlp_me";

/** The office needs OFFICE_PASSCODE when one is set; with none set (local dev) it is open. */
export async function officeAllowed(): Promise<boolean> {
  const pass = process.env.OFFICE_PASSCODE?.trim();
  if (!pass) return true;
  const jar = await cookies();
  return jar.get(OFFICE_COOKIE)?.value === "1";
}

/** The signed-in mentor's email, from the cookie set by /api/me. */
export async function meEmail(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(ME_COOKIE)?.value;
  return v ? decodeURIComponent(v).toLowerCase() : null;
}

export const notAvailable = () => NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
export const forbidden = () => NextResponse.json({ ok: false, error: "Sign in to the office first." }, { status: 401 });
