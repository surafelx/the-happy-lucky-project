import { NextResponse } from "next/server";

import { NEED_OPTIONS, ORG_TYPES, WHEN_OPTIONS, WHERE_OPTIONS } from "@/data/partner";
import type { NeedOption, OrgType, PartnerRequest, WhenOption, WhereOption } from "@/data/partner";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { appendJsonl } from "@/lib/store";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? (v.filter((x): x is T => allowed.includes(x as T)) as T[]) : [];
const one = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);

/**
 * Stores an organisation's request. Same destinations as the mentor form:
 * MENTOR_WEBHOOK_URL / JOIN_WEBHOOK_URL with kind: "partner", and locally
 * data/partners.jsonl. On Vercel with nothing configured: NOT_CONFIGURED.
 */
export async function POST(req: Request) {
  if (!MENTOR_FORM_ENABLED) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const type = one<OrgType>(body.type, ORG_TYPES);
  const when = one<WhenOption>(body.when, WHEN_OPTIONS);
  const record: PartnerRequest = {
    org: clean(body.org, 160),
    type: type ?? "Something else",
    location: clean(body.location, 160),
    contact: clean(body.contact, 120),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 40),
    kids: clean(body.kids, 160),
    needs: pick<NeedOption>(body.needs, NEED_OPTIONS),
    needsOther: clean(body.needsOther, 200),
    where: pick<WhereOption>(body.where, WHERE_OPTIONS),
    when: when ?? "Whenever it fits",
    note: clean(body.note, 2000),
    safeguarding: body.safeguarding === true,
  };

  if (record.org.length < 2) return NextResponse.json({ ok: false, error: "Please tell us the organisation’s name." }, { status: 400 });
  if (!type) return NextResponse.json({ ok: false, error: "Pick what kind of organisation you are." }, { status: 400 });
  if (record.contact.length < 2) return NextResponse.json({ ok: false, error: "Who should we write to?" }, { status: 400 });
  if (!EMAIL.test(record.email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  if (record.needs.length === 0) return NextResponse.json({ ok: false, error: "Pick at least one thing you need." }, { status: 400 });
  if (record.where.length === 0) return NextResponse.json({ ok: false, error: "Pick where it should happen." }, { status: 400 });
  if (!record.safeguarding) return NextResponse.json({ ok: false, error: "Please confirm the safeguarding line." }, { status: 400 });

  const at = new Date().toISOString();
  const id = `p-${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { kind: "partner", at, id, ...record };
  const webhook = (process.env.MENTOR_WEBHOOK_URL ?? process.env.JOIN_WEBHOOK_URL)?.trim();

  let code = "STORE_FAILED";
  try {
    if (webhook) {
      code = "WEBHOOK_FAILED";
      const res = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), redirect: "follow" });
      const text = await res.text();
      if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 200)}`);
      if (/"ok"\s*:\s*false|Script function not found|accounts\.google\.com/i.test(text)) throw new Error(`Webhook rejected the request: ${text.slice(0, 200)}`);
    } else if (process.env.VERCEL) {
      code = "NOT_CONFIGURED";
      throw new Error("No destination configured. Set MENTOR_WEBHOOK_URL or JOIN_WEBHOOK_URL.");
    }
    if (!process.env.VERCEL) {
      code = "FILE_FAILED";
      await appendJsonl("partners.jsonl", payload);
    }
  } catch (err) {
    console.error(`[partner] ${code}:`, err);
    const detail =
      req.headers.get("x-join-debug") !== null
        ? String(err instanceof Error ? err.message : err).replace(webhook ?? " ", "<webhook>").slice(0, 400)
        : undefined;
    return NextResponse.json(
      { ok: false, code, error: "Sorry, that didn’t go through on our side. Please try again in a moment.", detail },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id });
}
