import { NextResponse } from "next/server";

import { DASHBOARDS_ENABLED, forbidden, notAvailable, officeAllowed } from "@/lib/guard";
import { CAMPAIGN } from "@/data/campaign";
import { daysUntil, isoDate, ledgerTotals, skillCounts, suggestMentors, weeklyCounts } from "@/lib/office";
import { readJoins, readMentors, readActivity, readGoals, readLedger, readPartners, readPledges, readSubscriptions, readRsvps, readSundays, readTasks } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the office dashboard shows, in one call. */
export async function GET() {
  if (!DASHBOARDS_ENABLED) return notAvailable();
  if (!(await officeAllowed())) return forbidden();

  const now = new Date();
  const [joins, mentors, tasks, rsvps, ledger, goals, partners, pledges, subs, reminders] = await Promise.all([readJoins(), readMentors(), readTasks(), readRsvps(), readLedger(), readGoals(), readPartners(), readPledges(CAMPAIGN.key), readSubscriptions(), readActivity({ open: true, limit: 500 })]);
  const today = isoDate(now);
  const sundays = await readSundays(mentors, now);

  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const joinsThisWeek = joins.filter((j) => new Date(j.at) >= weekAgo).length;
  const byStatus = { new: 0, contacted: 0, inducted: 0, active: 0 };
  for (const m of mentors) byStatus[m.status]++;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const raisedThisMonth = ledger.filter((e) => e.kind === "in" && new Date(e.occurredAt) >= monthStart).reduce((t, e) => t + e.amount, 0);
  const books = ledgerTotals(ledger, goals);

  const thisSunday = sundays[0];
  const going = Object.entries(rsvps[thisSunday.date] ?? {}).filter(([, a]) => a === "yes").map(([id]) => id);

  return NextResponse.json({
    today: isoDate(now),
    kpis: {
      joined: new Set(joins.map((j) => j.email)).size,
      joinedThisWeek: joinsThisWeek,
      pool: mentors.length,
      byStatus,
      pledgesToVerify: pledges.filter((p) => p.status === "sent").length,
      supportersActive: subs.filter((x) => x.status === "active").length,
      supportersMonthly: subs.filter((x) => x.status === "active").reduce((t, x) => t + x.amount, 0),
      supportersDue: subs.filter((x) => x.status === "active" && x.nextDue && daysUntil(x.nextDue, today) <= 0).length + subs.filter((x) => x.status === "pending").length,
      remindersDue: reminders.filter((a) => a.dueAt && daysUntil(a.dueAt, today) <= 0).length,
      requestsOpen: partners.filter((p) => p.status !== "done").length,
      campaignsOpen: goals.filter((g) => g.status === "open").length,
      balance: books.balance,
      needed: books.needed,
      raisedThisMonth,
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
    thisSunday: { ...thisSunday, goingIds: going, going: going.length, notGoing: Object.values(rsvps[thisSunday.date] ?? {}).filter((a) => a === "no").length },
    requests: partners.map((p) => ({
      id: p.id,
      at: p.at,
      org: p.org,
      type: p.type,
      location: p.location,
      contact: p.contact,
      email: p.email,
      phone: p.phone,
      kids: p.kids,
      needs: p.needs,
      needsOther: p.needsOther,
      where: p.where,
      when: p.when,
      note: p.note,
      status: p.status,
      notes: p.notes,
      matched: p.matched,
      suggestions: suggestMentors(p.needs, mentors).map((s) => ({ id: s.mentor.id, name: s.mentor.name, club: s.mentor.club, because: s.because, score: s.score })),
    })),
  });
}
