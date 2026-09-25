import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { cleanReceiptLink } from "@/lib/office";
import { readLedgerEntry, saveVerification, setReceiptUrl } from "@/lib/store";
import type { Verification } from "@/lib/store";
import { agrees, verifyEnabled, verifyReceipt } from "@/lib/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const empty: Verification = { state: "", at: null, provider: "", payer: "", reference: "", amount: null, paidAt: null, note: "" };

/**
 * Checks one entry against the bank through links.et and keeps the answer.
 *
 * The receipt link is a credential: it is saved for the office, sent only to
 * links.et, and never logged or returned to the public feed. Sending an empty
 * link clears both the link and the verification.
 */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(b?.id);
  if (!b || !Number.isInteger(id)) return bad("Missing id.");
  const entry = await readLedgerEntry(id);
  if (!entry) return bad("No such entry.", 404);

  // An explicit empty link means "forget it"; otherwise use the given link, or the one already stored.
  const given = typeof b.url === "string" ? b.url.trim() : null;
  if (given === "") {
    await setReceiptUrl(id, "");
    return NextResponse.json({ ok: true, entry: await saveVerification(id, empty) });
  }
  const url = given ? cleanReceiptLink(given) : entry.receiptUrl || null;
  if (given && !url) return bad("That link doesn’t look right. It should start with https://");
  if (!url) return bad("Add the receipt link from the bank or Telebirr first.");
  if (given) await setReceiptUrl(id, url);

  if (!verifyEnabled()) return bad("Checking isn’t switched on. Add LINKS_API_KEY to the site’s environment.", 501);

  // The receipt number makes a retry replay the first answer instead of spending another check.
  const result = await verifyReceipt(url, `hlp-${entry.ref || id}`);
  if (!result.ok) {
    const saved = await saveVerification(id, { ...empty, state: "failed", at: result.checkedAt, note: result.message });
    return NextResponse.json({ ok: true, entry: saved, verified: false, retry: result.retry, message: result.message });
  }

  const r = result.receipt;
  const same = agrees({ amount: entry.amount, occurredAt: entry.occurredAt }, r);
  const trouble = [
    same.amount ? "" : `The bank says ${r.amount?.toLocaleString("en-US")} birr, this entry says ${entry.amount.toLocaleString("en-US")}.`,
    same.day ? "" : `The bank says it was paid on ${r.at?.slice(0, 10)}, this entry says ${entry.occurredAt.slice(0, 10)}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const saved = await saveVerification(id, {
    state: same.ok ? "verified" : "mismatch",
    at: result.checkedAt,
    provider: r.provider,
    payer: r.payer,
    reference: r.reference,
    amount: r.amount,
    paidAt: r.at,
    note: trouble,
  });
  return NextResponse.json({ ok: true, entry: saved, verified: same.ok, message: same.ok ? `${r.provider} confirmed it.` : trouble });
}
