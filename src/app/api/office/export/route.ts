import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { STATUS_LABEL } from "@/lib/office";
import { readMentors } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** The mentor pool as a CSV download. */
export async function GET() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();
  const mentors = await readMentors();
  const head = ["Joined", "Name", "Email", "Location", "Could share", "Something else", "How", "Club", "Status", "Sundays attended", "Notes", "Their note"];
  const rows = mentors.map((m) =>
    [
      m.at.slice(0, 10),
      m.name,
      m.email,
      m.location,
      m.share.join("; "),
      m.shareOther,
      m.contribute.join("; "),
      m.club,
      STATUS_LABEL[m.status],
      m.attended.length,
      m.notes,
      m.note,
    ]
      .map(cell)
      .join(","),
  );
  const csv = [head.map(cell).join(","), ...rows].join("\r\n") + "\r\n";
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mentor-pool-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
