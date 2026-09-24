import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { GOAL_COLORS, LEDGER_METHODS, METHOD_LABEL, checkLedgerEntry, ledgerTotals } from "@/lib/office";
import { addLedgerEntry, deleteLedgerEntry, editLedgerEntry, readGoals, readLedger, readLedgerEntry } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  return null;
}
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** A receipt photo, shrunk in the browser to a JPEG. undefined: none sent; null: refused. */
function receiptImage(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === "") return undefined;
  const s = typeof raw === "string" ? raw : "";
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 2_800_000 ? s : null;
}

/** The whole ledger for the office: entries with their real names, goals and totals. */
export async function GET() {
  const stop = await guard();
  if (stop) return stop;
  const [entries, goals] = await Promise.all([readLedger(), readGoals()]);
  const totals = ledgerTotals(entries, goals);
  return NextResponse.json({
    ok: true,
    totals: { in: totals.in, out: totals.out, balance: totals.balance, count: totals.count, needed: totals.needed, inKind: totals.inKind },
    goals: totals.goals,
    entries,
    colors: GOAL_COLORS,
    methods: LEDGER_METHODS.map((m) => ({ key: m, label: METHOD_LABEL[m] })),
  });
}

/** Log money in or out. */
export async function POST(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("Bad request.");
  const checked = checkLedgerEntry(b, (await readGoals()).map((g) => g.id));
  if (!checked.ok) return bad(checked.error);
  const image = receiptImage(b.image);
  if (image === null) return bad("That receipt photo is too large or not an image. Try another one.");
  const entry = await addLedgerEntry(checked.value, image ?? "");
  return NextResponse.json({ ok: true, entry }, { status: 201 });
}

/** Correct an entry. `image` replaces the receipt photo, `removeReceipt: true` takes it down. */
export async function PATCH(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = Number(b?.id);
  if (!b || !Number.isInteger(id)) return bad("Missing id.");
  if (!(await readLedgerEntry(id))) return bad("No such entry.", 404);
  const checked = checkLedgerEntry(b, (await readGoals()).map((g) => g.id));
  if (!checked.ok) return bad(checked.error);
  const image = receiptImage(b.image);
  if (image === null) return bad("That receipt photo is too large or not an image. Try another one.");
  const entry = await editLedgerEntry(id, checked.value, { receiptDataUrl: image, removeReceipt: b.removeReceipt === true });
  return NextResponse.json({ ok: true, entry });
}

/** Takes an entry off the page and out of the totals. The row is kept for the record. */
export async function DELETE(req: Request) {
  const stop = await guard();
  if (stop) return stop;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return bad("Missing id.");
  return (await deleteLedgerEntry(id)) ? NextResponse.json({ ok: true }) : bad("No such entry.", 404);
}
