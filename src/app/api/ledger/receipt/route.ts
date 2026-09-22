import { booksEnabled } from "@/lib/books";
import { readLedgerReceipt } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A published receipt photo, by receipt number. Taken-down receipts and deleted entries are gone. */
export async function GET(req: Request) {
  if (!booksEnabled()) return new Response("Not found", { status: 404 });
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  const file = /^HLP-\d{4}-\d{4,}$/.test(ref) ? await readLedgerReceipt(ref) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(file.data, "base64")), {
    headers: { "content-type": file.mime, "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" },
  });
}
