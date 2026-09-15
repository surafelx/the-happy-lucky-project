import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { readEmailCount, sheetsConfig } from "@/lib/sheets";

export const runtime = "nodejs";

/**
 * A starting number added to whatever the sheet reports (people who joined
 * before the counter existed). Override with JOIN_COUNT_BASE; set it to 0
 * once the sheet holds everyone.
 */
const BASE = Number(process.env.JOIN_COUNT_BASE ?? 18) || 0;

/** Local development only: unique emails in data/subscribers.jsonl (never present on Vercel). */
async function localFileCount(): Promise<number | null> {
  if (process.env.VERCEL) return null;
  try {
    const text = await readFile(path.join(process.cwd(), "data", "subscribers.jsonl"), "utf8");
    const emails = new Set<string>();
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as { email?: string };
        if (rec.email) emails.add(rec.email);
      } catch {}
    }
    return emails.size;
  } catch {
    return null;
  }
}
// The count is cached for a minute so a busy launch day doesn't hammer Google.
export const revalidate = 60;

/**
 * How many people have joined so far, read from the same place the join
 * form writes to: the Apps Script web app (its doGet) or the Sheets API.
 * Returns { count: null } when nothing is configured.
 */
export async function GET(req: Request) {
  // Hidden in production for now: the cards hide themselves when count is null.
  // Set JOIN_COUNT_ENABLED=1 in Vercel to switch it on.
  if (process.env.VERCEL && !process.env.JOIN_COUNT_ENABLED) return NextResponse.json({ count: null });
  const debug = req.headers.get("x-join-debug") !== null;
  const webhook = process.env.JOIN_WEBHOOK_URL?.trim();
  let raw: string | undefined;
  try {
    const sheets = sheetsConfig();
    let count: number | null = null;

    if (sheets) {
      count = await readEmailCount(sheets);
    } else if (webhook) {
      const res = await fetch(webhook, { redirect: "follow", next: { revalidate: 60 } });
      raw = await res.text();
      if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${raw.slice(0, 300)}`);
      const data = JSON.parse(raw) as { count?: unknown };
      if (typeof data.count === "number") count = data.count;
    }

    if (count === null) count = await localFileCount();
    const total = BASE + (count ?? 0);
    return NextResponse.json(debug ? { count: total, fromSource: count, base: BASE, raw: raw?.slice(0, 300) } : { count: total });
  } catch (err) {
    console.error("[join/count]", err);
    const fallback = await localFileCount();
    const total = BASE + (fallback ?? 0);
    const detail = debug
      ? String(err instanceof Error ? err.message : err).replace(webhook ?? " ", "<webhook>").slice(0, 400)
      : undefined;
    // Visible text only: Google error pages bury the message under a lot of script.
    const rawText = debug
      ? raw
          ?.replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 600)
      : undefined;
    return NextResponse.json({ count: total > 0 ? total : null, detail, raw: rawText });
  }
}
