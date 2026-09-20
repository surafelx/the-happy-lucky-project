import { NextResponse } from "next/server";

import { dbConfigured } from "@/lib/db";
import { JOIN_BASE } from "@/lib/join-count";
import { addSubscriber, countSubscribers } from "@/lib/store";

import { appendRow, sheetsConfig } from "@/lib/sheets";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Collects a joining email. Where it goes, in order of preference:
 *
 * 1. A Google Sheet, when GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and
 *    GOOGLE_PRIVATE_KEY are set.
 * 2. A webhook, when JOIN_WEBHOOK_URL is set (Google Apps Script, Zapier, ...).
 * 3. data/subscribers.jsonl next to the app, for a self-hosted server.
 *
 * On Vercel the file fallback cannot work (read-only filesystem), so the
 * route refuses with a clear error when it is deployed there unconfigured.
 * Failures carry a short `code` so they can be diagnosed from the browser.
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
  const webhook = process.env.JOIN_WEBHOOK_URL?.trim();

  // The database is the record and feeds the counter; the sheet is a copy the
  // team already reads. Once the record is safe, a sheet hiccup is only logged.
  let code = "STORE_FAILED";
  let saved = false;
  let fresh = true;
  let position: number | null = null;
  try {
    if (dbConfigured()) {
      code = "DB_FAILED";
      fresh = await addSubscriber(email, source, at);
      saved = true;
      position = JOIN_BASE + (await countSubscribers());
    }
    try {
      if (sheets) {
        code = "SHEETS_FAILED";
        await appendRow(sheets, [at, email, source]);
      } else if (webhook) {
        code = "WEBHOOK_FAILED";
        // Google Apps Script answers a POST with a redirect to the real response,
        // so follow it and check the final body rather than trusting the status alone.
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, at, source }),
          redirect: "follow",
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 200)}`);
        const rejected =
          /"ok"\s*:\s*false/.test(text) ||
          /Script function not found|Authorization is required|accounts\.google\.com/i.test(text);
        if (rejected) throw new Error(`Webhook rejected the request: ${text.slice(0, 200)}`);
      } else if (!saved) {
        code = "NOT_CONFIGURED";
        throw new Error("No destination configured. Set DATABASE_URL, JOIN_WEBHOOK_URL or the GOOGLE_* variables in the Vercel project and redeploy.");
      }
    } catch (copyErr) {
      if (!saved) throw copyErr;
      console.error(`[join] ${code} (the database has the record):`, copyErr);
    }
  } catch (err) {
    console.error(`[join] ${code}:`, err);
    // With an `x-join-debug` header the underlying message is included
    // (secrets redacted) so a misconfigured destination can be diagnosed remotely.
    const detail =
      req.headers.get("x-join-debug") !== null
        ? String(err instanceof Error ? err.message : err)
            .replace(webhook ?? " ", "<webhook>")
            .slice(0, 400)
        : undefined;
    return NextResponse.json(
      { ok: false, code, error: "Sorry, that didn’t go through on our side. Please try again in a moment.", detail },
      { status: 500 },
    );
  }

  // `position` is which person they are; `already` means this email had joined before.
  return NextResponse.json({ ok: true, position, already: !fresh });
}
