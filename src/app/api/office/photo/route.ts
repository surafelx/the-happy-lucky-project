import { readFile } from "node:fs/promises";
import path from "node:path";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { readMentors } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A mentor's smiling photo, served only to the office. */
export async function GET(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const m = (await readMentors()).find((x) => x.id === id);
  if (!m?.photo) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "data", m.photo));
    return new Response(new Uint8Array(buf), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=300" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
