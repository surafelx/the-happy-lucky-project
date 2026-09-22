import { NextResponse } from "next/server";

import { booksEnabled, publicBooks } from "@/lib/books";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The public ledger: balance, goals and every entry. The open books page polls this. */
export async function GET() {
  if (!booksEnabled()) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  try {
    return NextResponse.json(await publicBooks(), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[ledger] read failed:", err);
    return NextResponse.json({ ok: false, error: "The books couldn’t be read just now." }, { status: 500 });
  }
}
