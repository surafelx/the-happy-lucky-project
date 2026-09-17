"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { KIND_LABEL, STATUSES, STATUS_LABEL } from "@/lib/office";
import type { MentorStatus, SundayKind } from "@/lib/office";
import { burst, toast } from "@/lib/format";

type Mentor = {
  id: string; name: string; email: string; location: string; share: string[]; shareOther: string; contribute: string[];
  note: string; club: string; status: MentorStatus; notes: string; attended: string[]; at: string; hasPhoto: boolean; photo: string | null;
};
type Summary = {
  today: string;
  kpis: { joined: number; joinedThisWeek: number; pool: number; byStatus: Record<MentorStatus, number>; campaignsOpen: number; raisedThisMonth: number; yearTarget: number };
  weekly: { week: string; count: number }[];
  skills: { skill: string; count: number }[];
  mentors: Mentor[];
  tasks: { id: string; text: string; sub?: string; done: boolean }[];
  sundays: { date: string; kind: SundayKind; kidsExpected: number; slots: { time: string; title: string; lead: string }[]; going: number; notGoing: number }[];
  thisSunday: { date: string; kind: SundayKind; kidsExpected: number; slots: { time: string; title: string; lead: string }[]; goingIds: string[]; kidsTotal: number };
  receipts: { id: string; donor: string; place: string; campaign: string; amount: number; at: string; color: string }[];
  campaigns: { key: string; title: string; goal: number; raised: number; color: string }[];
};

const fmt = (n: number) => n.toLocaleString("en-US");
const day = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const STATUS_ICON: Record<MentorStatus, string> = { new: "●", contacted: "✉", inducted: "✓", active: "★" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function OfficeDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [needsPass, setNeedsPass] = useState(false);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<MentorStatus | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/office/summary", { cache: "no-store" });
    if (res.status === 401) return setNeedsPass(true);
    if (!res.ok) return setErr("The office couldn’t load. Is the feature switched on?");
    setNeedsPass(false);
    setData((await res.json()) as Summary);
  }, []);
  useEffect(() => {
    // Loading runs in a callback (after the first await), never synchronously in the effect body.
    void Promise.resolve().then(load);
  }, [load]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await post("/api/office/login", { passcode: pass });
      await load();
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  const setStatus = async (m: Mentor, status: MentorStatus) => {
    setData((d) => d && { ...d, mentors: d.mentors.map((x) => (x.id === m.id ? { ...x, status } : x)) });
    try {
      await post("/api/office/mentor", { id: m.id, status });
      toast(`${m.name.split(" ")[0]} → ${STATUS_LABEL[status]}`);
      if (status === "active") burst(undefined, undefined, 60);
      void load();
    } catch (x) {
      toast((x as Error).message);
      void load();
    }
  };
  const saveNotes = async (m: Mentor, notes: string) => {
    try {
      await post("/api/office/mentor", { id: m.id, notes });
      toast("Notes saved");
    } catch (x) {
      toast((x as Error).message);
    }
  };
  const markAttended = async (m: Mentor, date: string, present: boolean) => {
    try {
      await post("/api/office/mentor", { id: m.id, attended: { date, present } });
      toast(present ? `${m.name.split(" ")[0]} attended ${day(date)}` : "Attendance removed");
      void load();
    } catch (x) {
      toast((x as Error).message);
    }
  };
  const tickTask = async (id: string, done: boolean) => {
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done } : t)) });
    try {
      await post("/api/office/tasks", { id, done });
    } catch (x) {
      toast((x as Error).message);
      void load();
    }
  };
  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await post("/api/office/tasks", { add: true, text: newTask });
      setNewTask("");
      void load();
    } catch (x) {
      toast((x as Error).message);
    }
  };

  if (needsPass) {
    return (
      <div className="office-gate">
        <form className="card lift" onSubmit={signIn}>
          <span className="eyebrow">The office</span>
          <h2>Passcode, please</h2>
          <p className="note">This page holds names and emails. It opens with the passcode set in OFFICE_PASSCODE.</p>
          <input id="office-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passcode" autoFocus />
          {err ? <p className="msg err">🍀 {err}</p> : null}
          <button className="btn gold" type="submit">Open the office</button>
        </form>
      </div>
    );
  }
  if (err) return <p className="office-empty">{err}</p>;
  if (!data) return <p className="office-empty">Opening the office…</p>;

  const { kpis } = data;
  const max = Math.max(1, ...data.weekly.map((w) => w.count));
  const maxSkill = Math.max(1, ...data.skills.map((s) => s.count));
  const rows = data.mentors.filter((m) => filter === "all" || m.status === filter);
  const ts = data.thisSunday;
  const going = data.mentors.filter((m) => ts.goingIds.includes(m.id));
  const leads = data.mentors.filter((m) => m.status === "active" || m.status === "inducted");

  return (
    <div className="office">
      <div className="office-head">
        <div>
          <p className="eyebrow">{new Date(data.today + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1>This week</h1>
        </div>
        <div className="office-actions">
          <a className="btn sm" href="/api/office/export">Export sheet (CSV)</a>
          <a className="btn sm gold" href="#sunday">Plan Sunday</a>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi"><b className="num">{fmt(kpis.joined)}</b><span>Joined (emails)</span><em>+{kpis.joinedThisWeek} this week</em></div>
        <div className="card kpi"><b className="num">{fmt(kpis.pool)}</b><span>Mentor pool</span><em>{kpis.byStatus.new} new · {kpis.byStatus.active} active</em></div>
        <div className="card kpi"><b className="num">{kpis.campaignsOpen}</b><span>Campaigns open</span><em>next launch {day(data.sundays.find((s) => s.kind === "launch")?.date ?? data.sundays[0].date)}</em></div>
        <div className="card kpi"><b className="num">{fmt(kpis.raisedThisMonth)}</b><span>ETB raised this month</span><em>example ledger · {Math.round((data.campaigns.reduce((s, c) => s + c.raised, 0) / kpis.yearTarget) * 100)}% of the year</em></div>
      </div>

      <div className="office-main">
        <section className="card">
          <div className="pool-head">
            <h3>Mentor pool</h3>
            <span className="quiet">{data.mentors.length} people</span>
            <div className="pool-filters" role="tablist" aria-label="Filter by status">
              <button type="button" role="tab" aria-selected={filter === "all"} className={`pill${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All {data.mentors.length}</button>
              {STATUSES.map((s) => (
                <button key={s} type="button" role="tab" aria-selected={filter === s} className={`pill st-${s}${filter === s ? " on" : ""}`} onClick={() => setFilter(s)}>
                  {STATUS_ICON[s]} {STATUS_LABEL[s]} {kpis.byStatus[s]}
                </button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="office-empty">Nobody here yet. Share the mentor form and this fills up.</p>
          ) : (
            <div className="tblwrap">
              <table className="pool">
                <thead><tr><th>Who</th><th>Could share</th><th>How</th><th>Where</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <Fragment key={m.id}>
                      <tr className={open === m.id ? "open" : ""} onClick={() => setOpen(open === m.id ? null : m.id)}>
                        <td>
                          <div className="who">
                            {m.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element -- private, unoptimised local file
                              <img src={m.photo} alt="" />
                            ) : (
                              <i>{m.name[0]?.toUpperCase()}</i>
                            )}
                            <div><b>{m.name}</b><small>{m.email}</small></div>
                          </div>
                        </td>
                        <td>{m.share.map((s) => <span key={s} className="chip">{s === "Something else" && m.shareOther ? `Something else: ${m.shareOther}` : s}</span>)}</td>
                        <td>{m.contribute.map((s) => <span key={s} className="chip">{s}</span>)}</td>
                        <td>{m.location || <span className="quiet">—</span>}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <label className={`pill st-${m.status} select`}>
                            <span aria-hidden="true">{STATUS_ICON[m.status]}</span>
                            <select aria-label={`Status for ${m.name}`} value={m.status} onChange={(e) => void setStatus(m, e.target.value as MentorStatus)}>
                              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                            </select>
                          </label>
                        </td>
                      </tr>
                      {open === m.id ? (
                        <tr className="detail">
                          <td colSpan={5}>
                            <div className="detail-grid">
                              <div>
                                <p className="eyebrow">From the form · {m.at.slice(0, 10)}</p>
                                <p><b>Club:</b> {m.club} · <b>Sundays attended:</b> {m.attended.length}</p>
                                {m.note ? <p className="their-note">&ldquo;{m.note}&rdquo;</p> : <p className="quiet">No extra note.</p>}
                                <div className="attend">
                                  <span className="quiet">Mark attended:</span>
                                  {data.sundays.map((s) => (
                                    <label key={s.date} className="pill">
                                      <input type="checkbox" checked={m.attended.includes(s.date)} onChange={(e) => void markAttended(m, s.date, e.target.checked)} /> {day(s.date)}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <label className="field">
                                <span>Office notes (private)</span>
                                <textarea defaultValue={m.notes} rows={4} placeholder="Called on Tuesday, prefers mornings…" onBlur={(e) => void saveNotes(m, e.target.value)} />
                                <small className="quiet">Saved when you click away.</small>
                              </label>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="quiet">Click a row for the full form and notes. Status moves by hand: New → Contacted → Inducted → Active.</p>
        </section>

        <div className="office-side">
          <section className="card">
            <h3>Sign-ups per week</h3><p className="sub">Emails joined, last 8 weeks</p>
            <div className="chart" role="img" aria-label={`Sign-ups per week: ${data.weekly.map((w) => `${w.week}: ${w.count}`).join(", ")}`}>
              <div className="cols">
                {data.weekly.map((w, i) => (
                  <div key={w.week} className={i === data.weekly.length - 1 ? "hi" : ""} style={{ height: `${Math.max(4, (w.count / max) * 100)}%` }} title={`${w.week}: ${w.count}`}>
                    {i >= data.weekly.length - 2 || w.count === max ? <span>{w.count}</span> : null}
                  </div>
                ))}
              </div>
              <div className="x">{data.weekly.map((w) => <span key={w.week}>{new Date(w.week + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>)}</div>
            </div>
          </section>
          <section className="card">
            <h3>What the pool can share</h3><p className="sub">Top skills, people</p>
            {data.skills.length === 0 ? <p className="quiet">No submissions yet.</p> : (
              <div className="hbars">
                {data.skills.map((s) => (
                  <div className="hbar" key={s.skill}><b title={s.skill}>{s.skill}</b><i style={{ width: `${(s.count / maxSkill) * 100}%` }} /><span className="num">{s.count}</span></div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="office-bottom">
        <section id="sunday" className="card lift sunday">
          <p className="eyebrow gold">This Sunday · {day(ts.date)} · {KIND_LABEL[ts.kind]}</p>
          <h3>{ts.slots.length} slots, {leads.length} mentors available</h3>
          <div className="kpis three">
            <div className="kpi"><b className="num">{ts.kidsExpected}</b><span>kids expected</span></div>
            <div className="kpi"><b className="num">{going.length}</b><span>mentors said yes</span></div>
            <div className="kpi"><b className="num">{data.mentors.filter((m) => m.status === "contacted").length}</b><span>inductions due</span></div>
          </div>
          <div className="slots">
            {ts.slots.map((s) => <span key={s.time + s.title}><b>{s.time}</b> {s.title} · {s.lead}</span>)}
          </div>
          {going.length ? <p className="quiet">Coming: {going.map((m) => m.name.split(" ")[0]).join(", ")}</p> : <p className="quiet">No RSVPs yet. Mentors say yes from their own page.</p>}
          <div className="upcoming">
            {data.sundays.slice(1).map((s) => <span key={s.date} className="pill">{day(s.date)} · {KIND_LABEL[s.kind]} · {s.going} yes</span>)}
          </div>
        </section>

        <section className="card">
          <h3>To do</h3>
          <div className="tasks">
            {data.tasks.map((t) => (
              <label key={t.id} className={`task${t.done ? " done" : ""}`}>
                <input type="checkbox" checked={t.done} onChange={(e) => void tickTask(t.id, e.target.checked)} />
                <span><b>{t.text}</b>{t.sub ? <small>{t.sub}</small> : null}</span>
              </label>
            ))}
          </div>
          <form className="addtask" onSubmit={addTask}>
            <input id="new-task" type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task…" />
            <button className="btn sm" type="submit">Add</button>
          </form>
        </section>

        <section className="card">
          <div className="pool-head"><h3>Latest receipts</h3><span className="quiet">example ledger</span></div>
          <div className="rcpts">
            {data.receipts.map((r) => (
              <div className="rcpt" key={r.id}><i style={{ background: r.color }} /><div><b>{r.donor}, {r.place}</b><div className="id">{r.id} · {data.campaigns.find((c) => c.key === r.campaign)?.title}</div></div><span className="num amt">{fmt(r.amount)} ETB</span></div>
            ))}
          </div>
          <div className="camps">
            {data.campaigns.map((c) => (
              <div key={c.key}><div className="bar-track"><b style={{ width: `${Math.min(100, (c.raised / c.goal) * 100)}%`, background: c.color }} /></div><span className="quiet">{c.title.split(",")[0]} · {Math.round((c.raised / c.goal) * 100)}%</span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
