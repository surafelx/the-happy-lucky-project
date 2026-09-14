import { NextResponse } from "next/server";

import { readEmailCount, sheetsConfig } from "@/lib/sheets";

export const runtime = "nodejs";
// The count is cached for a minute so a busy launch day doesn't hammer Google.
export const revalidate = 60;

/**
 * How many people have joined so far, read from the same place the join
 * form writes to: the Apps Script web app (its doGet) or the Sheets API.
 * Returns { count: null } when nothing is configured.
 */
export async function GET() {
  try {
    const sheets = sheetsConfig();
    const webhook = process.env.JOIN_WEBHOOK_URL?.trim();
    let count: number | null = null;

    if (sheets) {
      count = await readEmailCount(sheets);
    } else if (webhook) {
      const res = await fetch(webhook, { redirect: "follow", next: { revalidate: 60 } });
      const text = await res.text();
      const data = JSON.parse(text) as { count?: unknown };
      if (typeof data.count === "number") count = data.count;
    }

    return NextResponse.json({ count });
  } catch (err) {
    console.error("[join/count]", err);
    return NextResponse.json({ count: null });
  }
}
