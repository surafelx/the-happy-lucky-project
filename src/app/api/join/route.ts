import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { appendRow, sheetsConfig } from "@/lib/sheets";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Collects a joining email. Where it goes, in order of preference:
 *
 * 1. A Google Sheet, when GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and
 *    GOOGLE_PRIVATE_KEY are set (the setup used on Vercel; see README).
 * 2. A webhook, when JOIN_WEBHOOK_URL is set (Zapier, Make, Apps Script, ...).
 * 3. data/subscribers.jsonl next to the app, for a self-hosted server.
 *
 * On Vercel the file fallback cannot work (read-only filesystem), so the
 * route refuses with a clear error when it is deployed there unconfigured.
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

  const at = new Date().toISOString();
  const source = "sunday-0";
  const sheets = sheetsConfig();
  const webhook = process.env.JOIN_WEBHOOK_URL;

  try {
    if (sheets) {
      await appendRow(sheets, [at, email, source]);
    } else if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, at, source }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } else if (process.env.VERCEL) {
      throw new Error(
        "No destination configured. Set GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in the Vercel project.",
      );
    } else {
      const dir = path.join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(
        path.join(dir, "subscribers.jsonl"),
        JSON.stringify({ email, at, source }) + "\n",
        "utf8",
      );
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
