import { NextResponse } from "next/server";

import { booksEnabled, publicBooks } from "@/lib/books";
import { countMentors } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The home page numbers that are not the join count (that one has its own
 * route with its own sources): how many people offered to help, and the money.
 * `money` is null until the first entry is logged, so the home page never shows 0 birr.
 */
export async function GET() {
  if (!booksEnabled()) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  try {
    const [volunteers, books] = await Promise.all([countMentors(), publicBooks()]);
    const t = books.totals;
    return NextResponse.json(
      { ok: true, volunteers, money: t.count > 0 ? { balance: t.balance, given: t.in, needed: t.needed, givers: t.givers } : null },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("[stats] read failed:", err);
    return NextResponse.json({ ok: false, error: "The numbers couldn’t be read just now." }, { status: 500 });
  }
}
