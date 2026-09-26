import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { addSubscriber, countSubscribers, readJoins, removeSubscriber } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Everyone who joined the letter, newest first. Office only: these are email addresses. */
export async function GET() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return NextResponse.json({ ok: true, members: await readJoins() });
}

/**
 * Bring emails into the database by pasting them: from the Google Sheet, a
 * notebook, anywhere. Duplicates are ignored, so pasting the whole sheet
 * again later is safe. Returns how many were new.
 */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  let body: { text?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const source = String(body.source ?? "sheet-import").slice(0, 40);
  const emails = [...new Set(String(body.text ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
  if (emails.length === 0) return NextResponse.json({ ok: false, error: "No email addresses found in that." }, { status: 400 });
  const before = await countSubscribers();
  for (const email of emails) await addSubscriber(email, source);
  const after = await countSubscribers();
  return NextResponse.json({ ok: true, found: emails.length, added: after - before, total: after });
}

/**
 * Takes someone off the list, which is what has to happen when they ask. The row
 * goes rather than being hidden, so the address is really gone.
 */
export async function DELETE(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ ok: false, error: "That is not an email address." }, { status: 400 });
  return (await removeSubscriber(email)) ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Not on the list." }, { status: 404 });
}

