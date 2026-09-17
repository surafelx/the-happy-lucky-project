import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { addTask, updateTask } from "@/lib/store";

export const runtime = "nodejs";

/** Tick, rename or add a task on the office to-do list. */
export async function POST(req: Request) {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  let body: { id?: unknown; done?: unknown; text?: unknown; sub?: unknown; add?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (body.add && typeof body.text === "string" && body.text.trim()) {
    const task = await addTask(body.text, typeof body.sub === "string" ? body.sub : undefined);
    return NextResponse.json({ ok: true, task });
  }
  const id = String(body.id ?? "");
  const task = await updateTask(id, {
    done: typeof body.done === "boolean" ? body.done : undefined,
    text: typeof body.text === "string" ? body.text : undefined,
  });
  if (!task) return NextResponse.json({ ok: false, error: "No such task." }, { status: 404 });
  return NextResponse.json({ ok: true, task });
}
