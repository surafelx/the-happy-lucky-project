import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { isoDate, skillCounts, weeklyCounts } from "@/lib/office";
import { kidsTotal, readJoins, readMentors, readReceipts, readRsvps, readSundays, readTasks } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the office dashboard shows, in one call. */
export async function GET() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();

  const now = new Date();
  const [joins, mentors, tasks, rsvps, ledger] = await Promise.all([readJoins(), readMentors(), readTasks(), readRsvps(), readReceipts()]);
  const sundays = await readSundays(mentors, now);

  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const joinsThisWeek = joins.filter((j) => new Date(j.at) >= weekAgo).length;
  const byStatus = { new: 0, contacted: 0, inducted: 0, active: 0 };
  for (const m of mentors) byStatus[m.status]++;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const raisedThisMonth = ledger.receipts.filter((r) => new Date(r.at) >= monthStart).reduce((s, r) => s + r.amount, 0);

  const thisSunday = sundays[0];
  const going = Object.entries(rsvps[thisSunday.date] ?? {}).filter(([, a]) => a === "yes").map(([id]) => id);

  return NextResponse.json({
    today: isoDate(now),
    kpis: {
      joined: new Set(joins.map((j) => j.email)).size,
      joinedThisWeek: joinsThisWeek,
      pool: mentors.length,
      byStatus,
      campaignsOpen: ledger.campaigns.length,
      raisedThisMonth,
      yearTarget: 8_000_000,
    },
    weekly: weeklyCounts(joins.map((j) => new Date(j.at)), now, 8),
    skills: skillCounts(mentors).slice(0, 8),
    mentors: mentors.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      location: m.location,
      share: m.share,
      shareOther: m.shareOther,
      contribute: m.contribute,
      note: m.note,
      club: m.club,
      status: m.status,
      notes: m.notes,
      attended: m.attended,
      at: m.at,
      hasPhoto: Boolean(m.photo),
      photo: m.photo ? `/api/office/photo?id=${encodeURIComponent(m.id)}` : null,
    })),
    tasks,
    sundays: sundays.map((s) => ({
      ...s,
      going: Object.entries(rsvps[s.date] ?? {}).filter(([, a]) => a === "yes").length,
      notGoing: Object.entries(rsvps[s.date] ?? {}).filter(([, a]) => a === "no").length,
    })),
    thisSunday: { ...thisSunday, goingIds: going, kidsTotal: kidsTotal() },
    receipts: ledger.receipts.slice(0, 6),
    campaigns: ledger.campaigns,
  });
}
