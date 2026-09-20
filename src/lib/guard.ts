import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";

/**
 * The office is part of the flagged feature. Locally it just works. On Vercel it
 * also needs somewhere to keep its data (DATABASE_URL) and a lock on the door
 * (OFFICE_PASSCODE): without both it stays switched off.
 */
const hosted = Boolean(process.env.VERCEL);
export const DASHBOARDS_ENABLED =
  MENTOR_FORM_ENABLED && (!hosted || (Boolean(process.env.DATABASE_URL?.trim()) && Boolean(process.env.OFFICE_PASSCODE?.trim())));

/**
 * The mentor dashboard signs people in by email alone, which is fine on a laptop
 * and not on the internet. It stays local until sign-in is a link sent to that email.
 */
export const ME_ENABLED = MENTOR_FORM_ENABLED && !hosted;

export const OFFICE_COOKIE = "hlp_office";
export const ME_COOKIE = "hlp_me";

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Does this attempt match OFFICE_PASSCODE? Compared in constant time. */
export const passcodeMatches = (attempt: string): boolean => {
  const pass = process.env.OFFICE_PASSCODE?.trim();
  return Boolean(pass) && same(createHmac("sha256", "hlp-office-attempt").update(attempt).digest("hex"), createHmac("sha256", "hlp-office-attempt").update(pass!).digest("hex"));
};

/**
 * What the office cookie holds: a keyed hash of the passcode. It cannot be
 * guessed without the passcode, and changing the passcode signs everyone out.
 */
export const officeToken = (): string | null => {
  const pass = process.env.OFFICE_PASSCODE?.trim();
  return pass ? createHmac("sha256", pass).update("hlp-office-session-v1").digest("hex") : null;
};

/** The office needs OFFICE_PASSCODE when one is set; with none set (local dev only) it is open. */
export async function officeAllowed(): Promise<boolean> {
  const token = officeToken();
  if (!token) return !hosted;
  const jar = await cookies();
  return same(jar.get(OFFICE_COOKIE)?.value ?? "", token);
}

/** The signed-in mentor's email, from the cookie set by /api/me. */
export async function meEmail(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(ME_COOKIE)?.value;
  return v ? decodeURIComponent(v).toLowerCase() : null;
}

export const notAvailable = () => NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
export const forbidden = () => NextResponse.json({ ok: false, error: "Sign in to the office first." }, { status: 401 });
