import { NextResponse } from "next/server";

import { deliver } from "@/lib/intake";
import { addMentor } from "@/lib/store";

import { CONTRIBUTE_OPTIONS, SHARE_OPTIONS } from "@/data/mentor";
import type { MentorInterest } from "@/data/mentor";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? (v.filter((x): x is T => allowed.includes(x as T)) as T[]) : [];

/**
 * Stores a mentor interest form. Destinations, in order:
 * 1. MENTOR_WEBHOOK_URL, or JOIN_WEBHOOK_URL, as JSON with kind: "mentor".
 * 2. data/mentors.jsonl next to the app (self-hosted / local development).
 * On Vercel with nothing configured it refuses with NOT_CONFIGURED.
 */
export async function POST(req: Request) {
  if (!MENTOR_FORM_ENABLED) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }); // honeypot
  }

  const record: MentorInterest = {
    name: clean(body.name, 120),
    email: clean(body.email, 254).toLowerCase(),
    location: clean(body.location, 120),
    share: pick(body.share, SHARE_OPTIONS),
    shareOther: clean(body.shareOther, 200),
    contribute: pick(body.contribute, CONTRIBUTE_OPTIONS),
    note: clean(body.note, 2000),
  };

  if (!record.name) return NextResponse.json({ ok: false, error: "Please tell us your name." }, { status: 400 });
  if (!EMAIL.test(record.email))
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  if (record.share.length === 0)
    return NextResponse.json({ ok: false, error: "Pick at least one thing you could share." }, { status: 400 });
  if (record.contribute.length === 0)
    return NextResponse.json({ ok: false, error: "Pick at least one way you'd like to contribute." }, { status: 400 });

  // Optional smiling photo: a small JPEG data URL from the browser (downscaled there).
  const photoRaw = typeof body.photo === "string" ? body.photo : "";
  const photo =
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photoRaw) && photoRaw.length < 1_500_000 ? photoRaw : "";

  const at = new Date().toISOString();
  const id = `${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { kind: "mentor", at, id, ...record, photo };
  const webhook = (process.env.MENTOR_WEBHOOK_URL ?? process.env.JOIN_WEBHOOK_URL)?.trim();

  const failed = await deliver({ tag: "mentor", req, payload, webhook, save: () => addMentor(record, photo, at, id) });
  if (failed) return failed;

  return NextResponse.json({ ok: true });
}
