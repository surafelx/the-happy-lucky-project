import { NextResponse } from "next/server";

import { dbConfigured } from "@/lib/db";
import { readEmailCount, sheetsConfig } from "@/lib/sheets";
import { countSubscribers } from "@/lib/store";

export const runtime = "nodejs";

/**
 * People who joined before the counter existed (they are on paper and in
 * inboxes, not in any table). Override with JOIN_COUNT_BASE. When the
 * database goes live, set it to the number of people in the sheet at that
 * moment, or import them through the office and set it back to 0.
 */
const BASE = Number(process.env.JOIN_COUNT_BASE ?? 18) || 0;
/** The first-month goal shown under the counter. */
const GOAL = Number(process.env.JOIN_GOAL ?? 50) || 50;

/** Is there a trustworthy number to show? On Vercel: only with a database, or when switched on by hand. */
const shown = () => !process.env.VERCEL || Boolean(process.env.DATABASE_URL?.trim()) || Boolean(process.env.JOIN_COUNT_ENABLED);

// The count is cached for a minute so a busy launch day doesn't hammer anything.
export const revalidate = 60;

/**
 * How many people have joined so far, and the goal. Sources, in order of
 * trust: the Sheets API, the database, then the Apps Script's doGet.
 * Returns { count: null } when nothing is configured or the counter is off.
 */
export async function GET(req: Request) {
  if (!shown()) return NextResponse.json({ count: null, goal: GOAL });
  const debug = req.headers.get("x-join-debug") !== null;
  const webhook = process.env.JOIN_WEBHOOK_URL?.trim();
  const errors: string[] = [];
  let count: number | null = null;
  let from = "none";

  const sheets = sheetsConfig();
  if (sheets) {
    try {
      count = await readEmailCount(sheets);
      from = "sheets";
    } catch (err) {
      errors.push(`sheets: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`);
    }
  }
  if (count === null && dbConfigured()) {
    try {
      count = await countSubscribers();
      from = "database";
    } catch (err) {
      errors.push(`database: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`);
    }
  }
  if (count === null && webhook) {
    try {
      const res = await fetch(webhook, { redirect: "follow", next: { revalidate: 60 } });
      const raw = await res.text();
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      const data = JSON.parse(raw) as { count?: unknown };
      if (typeof data.count === "number") {
        count = data.count;
        from = "webhook";
      }
    } catch (err) {
      errors.push(`webhook: ${String(err instanceof Error ? err.message : err).replace(webhook, "<webhook>").slice(0, 200)}`);
    }
  }

  if (errors.length) console.error("[join/count]", errors.join(" | "));
  const total = BASE + (count ?? 0);
  return NextResponse.json({
    count: total > 0 ? total : null,
    goal: GOAL,
    ...(debug ? { fromSource: count, from, base: BASE, errors } : {}),
  });
}
