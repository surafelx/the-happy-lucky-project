import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Collects a joining email.
 *
 * If JOIN_WEBHOOK_URL is set, the record is POSTed there as JSON
 * (a Zapier / Make / Google Apps Script / Formspree style endpoint).
 * Otherwise it is appended to data/subscribers.jsonl next to the app,
 * which suits a self-hosted server but not a read-only host such as Vercel.
 */
export async function POST(req: Request) {
  let body: { email?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  // Honeypot: real people never see this field, so a filled value is a bot.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const record = { email, at: new Date().toISOString(), source: "sunday-0" };
  const webhook = process.env.JOIN_WEBHOOK_URL;

  try {
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } else {
      const dir = path.join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(path.join(dir, "subscribers.jsonl"), JSON.stringify(record) + "\n", "utf8");
    }
  } catch (err) {
    console.error("[join] could not store email:", err);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your email right now. Please try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
