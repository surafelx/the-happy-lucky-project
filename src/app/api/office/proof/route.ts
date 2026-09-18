import { readFile } from "node:fs/promises";
import path from "node:path";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { readPledges } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A giver's payment screenshot, served only to the office. */
export async function GET(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const p = (await readPledges()).find((x) => x.id === id);
  const file = p?.proof?.image;
  if (!file || !/^pledge-proofs\/[\w-]+\.jpg$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "data", file));
    return new Response(new Uint8Array(buf), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
