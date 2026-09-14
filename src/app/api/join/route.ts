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

  let code = "STORE_FAILED";
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
    } else if (process.env.VERCEL) {
      code = "NOT_CONFIGURED";
      throw new Error(
        "No destination configured. Set JOIN_WEBHOOK_URL (or the GOOGLE_* variables) in the Vercel project and redeploy.",
      );
    } else {
      code = "FILE_FAILED";
      const dir = path.join(process.cwd(), "data");
      await mkdir(dir, { recursive: true });
      await appendFile(
        path.join(dir, "subscribers.jsonl"),
        JSON.stringify({ email, at, source }) + "\n",
        "utf8",
      );
    }
  } catch (err) {
    console.error(`[join] ${code}:`, err);
    return NextResponse.json(
      { ok: false, code, error: "We couldn't save your email right now. Please try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
