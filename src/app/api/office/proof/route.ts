import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { readFileById, readPledge } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A giver's payment screenshot, served only to the office. */
export async function GET(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const pledge = id ? await readPledge(id) : null;
  const file = pledge?.proof?.image ? await readFileById(pledge.proof.image) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(file.data, "base64")), { headers: { "content-type": file.mime, "cache-control": "private, no-store" } });
}
