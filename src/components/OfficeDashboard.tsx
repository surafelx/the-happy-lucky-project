"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { OfficePledges } from "@/components/OfficePledges";
import { AdminShell, useHashTab } from "@/components/AdminShell";
import { KIND_LABEL, REQUEST_LABEL, REQUEST_STATUSES, STATUSES, STATUS_LABEL } from "@/lib/office";
import type { MentorStatus, RequestStatus, SundayKind } from "@/lib/office";
import { burst, toast } from "@/lib/format";

type Mentor = {
  id: string; name: string; email: string; location: string; share: string[]; shareOther: string; contribute: string[];
  note: string; club: string; status: MentorStatus; notes: string; attended: string[]; at: string; hasPhoto: boolean; photo: string | null;
};
type Request = {
  id: string; at: string; org: string; type: string; location: string; contact: string; email: string; phone: string; kids: string;
  needs: string[]; needsOther: string; where: string[]; when: string; note: string; status: RequestStatus; notes: string; matched: string[];
  suggestions: { id: string; name: string; club: string; because: string[]; score: number }[];
};
type Sunday = { date: string; kind: SundayKind; kidsExpected: number; slots: { time: string; title: string; lead: string }[]; going: number; notGoing: number };
type Summary = {
  today: string;
  kpis: { joined: number; joinedThisWeek: number; pool: number; byStatus: Record<MentorStatus, number>; requestsOpen: number; pledgesToVerify: number; campaignsOpen: number; raisedThisMonth: number; yearTarget: number };
  weekly: { week: string; count: number }[];
  skills: { skill: string; count: number }[];
  mentors: Mentor[];
  tasks: { id: string; text: string; sub?: string; done: boolean }[];
  sundays: Sunday[];
  thisSunday: Sunday & { goingIds: string[]; kidsTotal: number };
  receipts: { id: string; donor: string; place: string; campaign: string; amount: number; at: string; color: string }[];
  campaigns: { key: string; title: string; goal: number; raised: number; color: string }[];
  requests: Request[];
};

const TABS = [
  { key: "overview", label: "Overview", icon: "▦" },
  { key: "mentors", label: "Mentors", icon: "👥" },
  { key: "requests", label: "Requests", icon: "📨" },
  { key: "sundays", label: "Sundays", icon: "📅" },
  { key: "tasks", label: "To do", icon: "☑" },
  { key: "pledges", label: "Pledges", icon: "🤝" },
  { key: "receipts", label: "Receipts", icon: "🧾" },
];
const fmt = (n: number) => n.toLocaleString("en-US");
const day = (iso: string, long = false) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
const STATUS_ICON: Record<MentorStatus, string> = { new: "●", contacted: "✉", inducted: "✓", active: "★" };
const REQ_ICON: Record<RequestStatus, string> = { new: "●", contacted: "✉", matched: "🤝", done: "✓" };
const CLUB: Record<string, string> = { coding: "Coding", reading: "Reading", art: "Art", science: "Science", general: "General" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}


function StatusSelect({ m, onChange }: { m: Mentor; onChange: (status: MentorStatus) => void }) {
  return (
    <label className={`pill st-${m.status} select`} onClick={(e) => e.stopPropagation()}>
      <span aria-hidden="true">{STATUS_ICON[m.status]}</span>
      <select aria-label={`Status for ${m.name}`} value={m.status} onChange={(e) => onChange(e.target.value as MentorStatus)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OfficeDashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [needsPass, setNeedsPass] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useHashTab("overview", TABS.map((t) => t.key));
  const router = useRouter();
  const [filter, setFilter] = useState<MentorStatus | "all">("all");
  const [q, setQ] = useState("");
  const [openMentor, setOpenMentor] = useState<string | null>(null);
  const [openReq, setOpenReq] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [paste, setPaste] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/office/summary", { cache: "no-store" });
    if (res.status === 401) return setNeedsPass(true);
    if (!res.ok) return setErr("The office couldn’t load. Is the feature switched on?");
    setNeedsPass(false);
    setData((await res.json()) as Summary);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const act = async (url: string, body: unknown, ok?: string, confetti = false) => {
    try {
      await post(url, body);
      if (ok) toast(ok);
      if (confetti) burst(undefined, undefined, 60);
      await load();
    } catch (x) {
      toast((x as Error).message);
      await load();
    }
  };

  const mentors = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.mentors.filter(
      (m) =>
        (filter === "all" || m.status === filter) &&
        (!needle || [m.name, m.email, m.location, ...m.share, ...m.contribute, m.shareOther].join(" ").toLowerCase().includes(needle)),
    );
  }, [data, filter, q]);

  useEffect(() => {
    if (needsPass) router.replace("/enter");
  }, [needsPass, router]);

  if (needsPass) return <p className="office-empty">Taking you to the door…</p>;
  if (err) return <p className="office-empty">{err}</p>;
  if (!data) return <p className="office-empty">Opening the office…</p>;

  const { kpis } = data;
  const max = Math.max(1, ...data.weekly.map((w) => w.count));
  const maxSkill = Math.max(1, ...data.skills.map((s) => s.count));
  const ts = data.thisSunday;
  const going = data.mentors.filter((m) => ts.goingIds.includes(m.id));
  const sel = data.mentors.find((m) => m.id === openMentor) ?? null;
  const selReq = data.requests.find((r) => r.id === openReq) ?? null;
  const openTasks = data.tasks.filter((t) => !t.done).length;
  const newReqs = data.requests.filter((r) => r.status === "new").length;

  const signOut = async () => {
    await fetch("/api/office/login", { method: "DELETE" });
    router.push("/");
  };


  return (
    <AdminShell
      product="The office"
      tabs={TABS.map((t) => ({ ...t, badge: t.key === "mentors" ? kpis.byStatus.new || undefined : t.key === "requests" ? newReqs || undefined : t.key === "tasks" ? openTasks || undefined : t.key === "pledges" ? kpis.pledgesToVerify || undefined : undefined }))}
      active={tab}
      onTab={setTab}
      who={{ name: "Office", role: day(data.today, true), initial: "O" }}
      onSignOut={signOut}
      actions={
        <>
          <a className="abtn" href="/api/office/export">Export CSV</a>
          <button type="button" className="abtn primary" onClick={() => setTab("sundays")}>Plan Sunday</button>
        </>
      }
    >
      {tab === "overview" ? (
        <div className="agrid">
          <div className="akpis">
            <div className="akpi"><span>Joined (emails)</span><b className="num">{fmt(kpis.joined)}</b><em>+{kpis.joinedThisWeek} this week</em></div>
            <div className="akpi"><span>Mentor pool</span><b className="num">{fmt(kpis.pool)}</b><em>{kpis.byStatus.new} new · {kpis.byStatus.active} active</em></div>
            <div className="akpi"><span>Open requests</span><b className="num">{kpis.requestsOpen}</b><em>{newReqs} waiting for a reply</em></div>
            <div className="akpi"><span>Raised this month</span><b className="num">{fmt(kpis.raisedThisMonth)} <small>ETB</small></b><em>example ledger</em></div>
          </div>

          <div className="apanel span2">
            <div className="ahead"><h2>Sign-ups per week</h2><span className="quiet">emails joined, last 8 weeks</span></div>
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
          </div>

          <div className="apanel">
            <div className="ahead"><h2>What the pool can share</h2></div>
            {data.skills.length === 0 ? <p className="quiet">No submissions yet.</p> : (
              <div className="hbars">{data.skills.map((s) => <div className="hbar" key={s.skill}><b title={s.skill}>{s.skill}</b><i style={{ width: `${(s.count / maxSkill) * 100}%` }} /><span className="num">{s.count}</span></div>)}</div>
            )}
          </div>

          <div className="apanel">
            <div className="ahead"><h2>This Sunday</h2><span className="quiet">{day(ts.date)} · {KIND_LABEL[ts.kind]}</span></div>
            <div className="kpis three">
              <div className="kpi"><b className="num">{ts.kidsExpected}</b><span>kids expected</span></div>
              <div className="kpi"><b className="num">{going.length}</b><span>mentors coming</span></div>
              <div className="kpi"><b className="num">{ts.slots.length}</b><span>slots</span></div>
            </div>
            <div className="slots">{ts.slots.map((s) => <span key={s.time + s.title}><b>{s.time}</b> {s.title} · {s.lead}</span>)}</div>
            <button type="button" className="abtn" onClick={() => setTab("sundays")}>Open the plan</button>
          </div>

          <div className="apanel">
            <div className="ahead"><h2>Needs a reply</h2><span className="quiet">{newReqs + kpis.byStatus.new} items</span></div>
            <ul className="alist">
              {data.requests.filter((r) => r.status === "new").map((r) => <li key={r.id}><button type="button" onClick={() => { setTab("requests"); setOpenReq(r.id); }}>📨 {r.org} <small>{r.needs.slice(0, 2).join(", ")}</small></button></li>)}
              {data.mentors.filter((m) => m.status === "new").map((m) => <li key={m.id}><button type="button" onClick={() => { setTab("mentors"); setOpenMentor(m.id); }}>🍀 {m.name} <small>{m.share.slice(0, 2).join(", ")}</small></button></li>)}
              {newReqs + kpis.byStatus.new === 0 ? <li className="quiet">Inbox zero. Enjoy it.</li> : null}
            </ul>
          </div>

          <div className="apanel">
            <div className="ahead"><h2>To do</h2><span className="quiet">{openTasks} open</span></div>
            <div className="tasks">
              {data.tasks.filter((t) => !t.done).slice(0, 4).map((t) => (
                <label key={t.id} className="task"><input type="checkbox" checked={t.done} onChange={(e) => void act("/api/office/tasks", { id: t.id, done: e.target.checked })} /><span><b>{t.text}</b>{t.sub ? <small>{t.sub}</small> : null}</span></label>
              ))}
            </div>
            <button type="button" className="abtn" onClick={() => setTab("tasks")}>All tasks</button>
          </div>
          <div className="apanel span2">
            <div className="ahead"><h2>Bring in emails</h2><span className="quiet">paste the email column from the Google Sheet; duplicates are skipped</span></div>
            <form
              className="aimport"
              onSubmit={(e) => {
                e.preventDefault();
                if (!paste.trim()) return;
                void act("/api/office/subscribers", { text: paste, source: "sheet-import" }, "Emails brought in").then(() => setPaste(""));
              }}
            >
              <textarea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="one@example.com&#10;two@example.com" aria-label="Emails to import" />
              <button type="submit" className="abtn primary" disabled={!paste.trim()}>Add to the list</button>
            </form>
          </div>
        </div>
      ) : null}

      {tab === "mentors" ? (
        <div className={`asplit${sel ? " with-detail" : ""}`}>
          <div className="apanel">
            <div className="ahead">
              <input id="mentor-search" className="asearch" type="search" placeholder="Search name, email, skill…" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="pool-filters" role="tablist" aria-label="Filter by status">
                <button type="button" role="tab" aria-selected={filter === "all"} className={`pill${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All {data.mentors.length}</button>
                {STATUSES.map((s) => <button key={s} type="button" role="tab" aria-selected={filter === s} className={`pill st-${s}${filter === s ? " on" : ""}`} onClick={() => setFilter(s)}>{STATUS_ICON[s]} {STATUS_LABEL[s]} {kpis.byStatus[s]}</button>)}
              </div>
            </div>
            {mentors.length === 0 ? <p className="office-empty">Nobody matches. Share the mentor form and this fills up.</p> : (
              <div className="tblwrap">
                <table className="atable">
                  <thead><tr><th>Name</th><th>Could share</th><th>How</th><th>Club</th><th>Where</th><th>Sundays</th><th>Status</th></tr></thead>
                  <tbody>
                    {mentors.map((m) => (
                      <tr key={m.id} className={openMentor === m.id ? "open" : ""} onClick={() => setOpenMentor(openMentor === m.id ? null : m.id)}>
                        <td><div className="who">{m.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- private local file
                          <img src={m.photo} alt="" />
                        ) : <i>{m.name[0]?.toUpperCase()}</i>}<div><b>{m.name}</b><small>{m.email}</small></div></div></td>
                        <td>{m.share.map((s) => <span key={s} className="chip">{s === "Something else" && m.shareOther ? m.shareOther : s}</span>)}</td>
                        <td>{m.contribute.map((s) => <span key={s} className="chip">{s}</span>)}</td>
                        <td>{CLUB[m.club]}</td>
                        <td>{m.location || <span className="quiet">—</span>}</td>
                        <td className="num">{m.attended.length}</td>
                        <td><StatusSelect m={m} onChange={(st) => void act("/api/office/mentor", { id: m.id, status: st }, `${m.name.split(" ")[0]} → ${STATUS_LABEL[st]}`, st === "active")} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {sel ? (
            <aside className="adetail" aria-label={`${sel.name} details`}>
              <div className="ahead"><h2>{sel.name}</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setOpenMentor(null)}>×</button></div>
              <p className="quiet">{sel.email}{sel.location ? ` · ${sel.location}` : ""} · joined {sel.at.slice(0, 10)}</p>
              <dl className="adl">
                <dt>Status</dt><dd><StatusSelect m={sel} onChange={(st) => void act("/api/office/mentor", { id: sel.id, status: st }, `${sel.name.split(" ")[0]} → ${STATUS_LABEL[st]}`, st === "active")} /></dd>
                <dt>Club</dt><dd>{CLUB[sel.club]}</dd>
                <dt>Could share</dt><dd>{sel.share.map((s) => <span key={s} className="chip">{s === "Something else" && sel.shareOther ? sel.shareOther : s}</span>)}</dd>
                <dt>How</dt><dd>{sel.contribute.map((s) => <span key={s} className="chip">{s}</span>)}</dd>
                {sel.note ? <><dt>Their note</dt><dd className="their-note">&ldquo;{sel.note}&rdquo;</dd></> : null}
                <dt>Attended</dt>
                <dd className="attend">
                  {data.sundays.map((s) => (
                    <label key={s.date} className="pill"><input type="checkbox" checked={sel.attended.includes(s.date)} onChange={(e) => void act("/api/office/mentor", { id: sel.id, attended: { date: s.date, present: e.target.checked } }, e.target.checked ? `${sel.name.split(" ")[0]} attended ${day(s.date)}` : "Attendance removed")} /> {day(s.date)}</label>
                  ))}
                </dd>
              </dl>
              <label className="field">
                <span>Office notes (private)</span>
                <textarea key={sel.id} defaultValue={sel.notes} rows={5} placeholder="Called on Tuesday, prefers mornings…" onBlur={(e) => void act("/api/office/mentor", { id: sel.id, notes: e.target.value }, "Notes saved")} />
                <small className="quiet">Saved when you click away.</small>
              </label>
              <a className="abtn" href={`mailto:${sel.email}?subject=${encodeURIComponent("Welcome to the Sundays")}`}>Write to {sel.name.split(" ")[0]}</a>
            </aside>
          ) : null}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className={`asplit${selReq ? " with-detail" : ""}`}>
          <div className="apanel">
            <div className="ahead"><h2>Requests from organisations</h2><span className="quiet">{data.requests.length} total · {kpis.requestsOpen} open</span><a className="abtn" href="/partners" style={{ marginLeft: "auto" }}>The request form</a></div>
            {data.requests.length === 0 ? <p className="office-empty">No requests yet. Share the organisations page with a school or a children&apos;s home.</p> : (
              <div className="tblwrap">
                <table className="atable">
                  <thead><tr><th>Organisation</th><th>Needs</th><th>Where · when</th><th>Matched</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.requests.map((r) => (
                      <tr key={r.id} className={openReq === r.id ? "open" : ""} onClick={() => setOpenReq(openReq === r.id ? null : r.id)}>
                        <td><b>{r.org}</b><small className="sub">{r.type}{r.location ? ` · ${r.location}` : ""} · {r.at.slice(0, 10)}</small></td>
                        <td>{r.needs.map((n) => <span key={n} className="chip">{n === "Something else" && r.needsOther ? r.needsOther : n}</span>)}</td>
                        <td>{r.where.join(" / ")}<small className="sub">{r.when}</small></td>
                        <td className="num">{r.matched.length}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <label className={`pill rq-${r.status} select`}><span aria-hidden="true">{REQ_ICON[r.status]}</span>
                            <select aria-label={`Status for ${r.org}`} value={r.status} onChange={(e) => void act("/api/office/partner", { id: r.id, status: e.target.value }, `${r.org} → ${REQUEST_LABEL[e.target.value as RequestStatus]}`, e.target.value === "done")}>
                              {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_LABEL[s]}</option>)}
                            </select>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {selReq ? (
            <aside className="adetail" aria-label={`${selReq.org} request`}>
              <div className="ahead"><h2>{selReq.org}</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setOpenReq(null)}>×</button></div>
              <p className="quiet">{selReq.type}{selReq.location ? ` · ${selReq.location}` : ""} · {selReq.at.slice(0, 10)}</p>
              <dl className="adl">
                <dt>Contact</dt><dd>{selReq.contact} · <a href={`mailto:${selReq.email}`}>{selReq.email}</a>{selReq.phone ? ` · ${selReq.phone}` : ""}</dd>
                <dt>Children</dt><dd>{selReq.kids || <span className="quiet">not specified</span>}</dd>
                <dt>Needs</dt><dd>{selReq.needs.map((n) => <span key={n} className="chip">{n === "Something else" && selReq.needsOther ? selReq.needsOther : n}</span>)}</dd>
                <dt>Where · when</dt><dd>{selReq.where.join(" / ")} · {selReq.when}</dd>
                {selReq.note ? <><dt>Their note</dt><dd className="their-note">&ldquo;{selReq.note}&rdquo;</dd></> : null}
                <dt>Suggested from the pool</dt>
                <dd className="attend">
                  {selReq.suggestions.length === 0 ? <span className="quiet">nobody fits yet</span> : selReq.suggestions.map((sg) => (
                    <label key={sg.id} className={`pill${selReq.matched.includes(sg.id) ? " on" : ""}`} title={`score ${sg.score}: ${sg.because.join(", ")}`}>
                      <input type="checkbox" checked={selReq.matched.includes(sg.id)} onChange={(e) => void act("/api/office/partner", { id: selReq.id, match: { mentorId: sg.id, on: e.target.checked } }, e.target.checked ? "Matched. Now write to both of them." : "Match removed", e.target.checked)} />
                      {sg.name.split(" ")[0]} · {sg.because[0] ?? CLUB[sg.club]}
                    </label>
                  ))}
                </dd>
              </dl>
              <label className="field">
                <span>Office notes (private)</span>
                <textarea key={selReq.id} defaultValue={selReq.notes} rows={5} placeholder="Who you wrote to, what was agreed…" onBlur={(e) => void act("/api/office/partner", { id: selReq.id, notes: e.target.value }, "Notes saved")} />
              </label>
              <a className="abtn" href={`mailto:${selReq.email}?subject=${encodeURIComponent(`Your request to Happy Lucky Chacho`)}`}>Write to {selReq.contact.split(" ")[0]}</a>
            </aside>
          ) : null}
        </div>
      ) : null}

      {tab === "sundays" ? (
        <div className="agrid">
          {data.sundays.map((s, i) => {
            const rs = data.mentors;
            return (
              <div key={s.date} className={`apanel${i === 0 ? " span2" : ""}`}>
                <div className="ahead"><h2>{day(s.date, true)}</h2><span className={`pill k-${s.kind}`}>{KIND_LABEL[s.kind]}</span><span className="quiet" style={{ marginLeft: "auto" }}>{s.kidsExpected} kids expected · {s.going} yes · {s.notGoing} no</span></div>
                <div className="slots">{s.slots.map((x) => <span key={x.time + x.title}><b>{x.time}</b> {x.title} · {x.lead}</span>)}</div>
                <details className="adetails" open={i === 0}>
                  <summary>Attendance ({rs.filter((m) => m.attended.includes(s.date)).length} marked)</summary>
                  <div className="attend">
                    {rs.map((m) => (
                      <label key={m.id} className={`pill${m.attended.includes(s.date) ? " on" : ""}`}><input type="checkbox" checked={m.attended.includes(s.date)} onChange={(e) => void act("/api/office/mentor", { id: m.id, attended: { date: s.date, present: e.target.checked } })} /> {m.name.split(" ")[0]}</label>
                    ))}
                    {rs.length === 0 ? <span className="quiet">No mentors yet.</span> : null}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="apanel narrow">
          <div className="ahead"><h2>To do</h2><span className="quiet">{openTasks} open · {data.tasks.length - openTasks} done</span></div>
          <div className="tasks">
            {data.tasks.map((t) => (
              <label key={t.id} className={`task${t.done ? " done" : ""}`}><input type="checkbox" checked={t.done} onChange={(e) => void act("/api/office/tasks", { id: t.id, done: e.target.checked })} /><span><b>{t.text}</b>{t.sub ? <small>{t.sub}</small> : null}</span></label>
            ))}
          </div>
          <form className="addtask" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!newTask.trim()) return; void act("/api/office/tasks", { add: true, text: newTask }, "Added"); setNewTask(""); }}>
            <input id="new-task" type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task…" />
            <button className="abtn primary" type="submit">Add</button>
          </form>
        </div>
      ) : null}

      {tab === "pledges" ? <OfficePledges toast={toast} onChanged={() => void load()} /> : null}

      {tab === "receipts" ? (
        <div className="agrid">
          <div className="apanel span2">
            <div className="ahead"><h2>Latest receipts</h2><span className="quiet">example ledger until a payment provider is connected</span></div>
            <div className="tblwrap">
              <table className="atable">
                <thead><tr><th>Receipt</th><th>Donor</th><th>For</th><th>Date</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {data.receipts.map((r) => (
                    <tr key={r.id}><td className="mono">{r.id}</td><td>{r.donor}, {r.place}</td><td><i className="dot" style={{ background: r.color }} />{data.campaigns.find((c) => c.key === r.campaign)?.title}</td><td>{new Date(r.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td><td className="r num">{fmt(r.amount)} ETB</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="apanel">
            <div className="ahead"><h2>Campaigns</h2></div>
            <div className="camps one">
              {data.campaigns.map((c) => (
                <div key={c.key}><b className="sub">{c.title}</b><div className="bar-track"><b style={{ width: `${Math.min(100, (c.raised / c.goal) * 100)}%`, background: c.color }} /></div><span className="quiet num">{fmt(c.raised)} of {fmt(c.goal)} ETB · {Math.round((c.raised / c.goal) * 100)}%</span></div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
