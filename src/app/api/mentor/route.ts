import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { CONTRIBUTE_OPTIONS, SHARE_OPTIONS } from "@/data/mentor";
import type { MentorInterest } from "@/data/mentor";

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

  const at = new Date().toISOString();
  const payload = { kind: "mentor", at, ...record };
  const webhook = (process.env.MENTOR_WEBHOOK_URL ?? process.env.JOIN_WEBHOOK_URL)?.trim();

  let code = "STORE_FAILED";
  try {
    if (webhook) {
      code = "WEBHOOK_FAILED";
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 200)}`);
      if (/"ok"\s*:\s*false|Script function not found|accounts\.google\.com/i.test(text)) {
        throw new Error(`Webhook rejected the request: ${text.slice(0, 200)}`);
      }
    } else if (process.env.VERCEL) {
      code = "NOT_CONFIGURED";
      throw new Error("No destination configured. Set MENTOR_WEBHOOK_URL or JOIN_WEBHOOK_URL.");
    }
    if (!process.env.VERCEL) {
      code = "FILE_FAILED";
      const dir = path.join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(path.join(dir, "mentors.jsonl"), JSON.stringify(payload) + "\n", "utf8");
    }
  } catch (err) {
    console.error(`[mentor] ${code}:`, err);
    const detail =
      req.headers.get("x-join-debug") !== null
        ? String(err instanceof Error ? err.message : err).replace(webhook ?? " ", "<webhook>").slice(0, 400)
        : undefined;
    return NextResponse.json(
      { ok: false, code, error: "Sorry, that didn’t go through on our side. Please try again in a moment.", detail },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
