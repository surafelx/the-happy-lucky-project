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
export async function GET(req: Request) {
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

    return NextResponse.json(debug ? { count, raw: raw?.slice(0, 300) } : { count });
  } catch (err) {
    console.error("[join/count]", err);
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
    return NextResponse.json({ count: null, detail, raw: rawText });
  }
}
