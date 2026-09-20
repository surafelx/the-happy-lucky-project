import { NextResponse } from "next/server";

import { dbConfigured } from "./db.ts";

/**
 * What every public form does once its input is valid:
 *
 *  1. Save to the database, when there is one. That is the record.
 *  2. Forward to the Google Apps Script webhook, when one is set (a second copy
 *     in a sheet the team already reads). With the record safely saved, a
 *     webhook hiccup is logged and forgotten; without a database the webhook
 *     is the only copy, so its failure is the request's failure.
 *  3. With neither, say so plainly: NOT_CONFIGURED.
 *
 * Returns null on success, or the error response to send.
 */
export async function deliver(opts: {
  tag: string;
  req: Request;
  payload: unknown;
  save: () => Promise<unknown>;
  webhook?: string;
}): Promise<NextResponse | null> {
  const { tag, req, payload, save } = opts;
  const webhook = opts.webhook?.trim();
  const fail = (code: string, err: unknown) => {
    console.error(`[${tag}] ${code}:`, err);
    const detail =
      req.headers.get("x-join-debug") !== null
        ? String(err instanceof Error ? err.message : err).replace(webhook ?? " ", "<webhook>").slice(0, 400)
        : undefined;
    return NextResponse.json({ ok: false, code, error: "Sorry, that didn’t go through on our side. Please try again in a moment.", detail }, { status: 500 });
  };

  let saved = false;
  if (dbConfigured()) {
    try {
      await save();
      saved = true;
    } catch (err) {
      return fail("DB_FAILED", err);
    }
  }

  if (webhook) {
    const send = async () => {
      const res = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), redirect: "follow" });
      const text = await res.text();
      if (!res.ok) throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 200)}`);
      if (/"ok"\s*:\s*false|Script function not found|Authorization is required|accounts\.google\.com/i.test(text)) throw new Error(`Webhook rejected the request: ${text.slice(0, 200)}`);
    };
    try {
      await send();
    } catch (first) {
      console.warn(`[${tag}] webhook failed once, retrying:`, first);
      try {
        await send(); // Apps Script now and then answers 404 for a moment
      } catch (second) {
        if (!saved) return fail("WEBHOOK_FAILED", second);
        console.error(`[${tag}] webhook failed twice; the database has the record:`, second);
      }
    }
  } else if (!saved) {
    return fail("NOT_CONFIGURED", new Error("No destination configured. Set DATABASE_URL (or a webhook URL) in the Vercel project and redeploy."));
  }
  return null;
}
