import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { readFileById, readMentors } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A mentor's smiling photo, served only to the office. */
export async function GET(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const m = (await readMentors()).find((x) => x.id === id);
  const file = m?.photo ? await readFileById(m.photo) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(file.data, "base64")), { headers: { "content-type": file.mime, "cache-control": "private, max-age=300" } });
}
