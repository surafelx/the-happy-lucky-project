"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type SubjectKind = "subscriber" | "mentor" | "partner" | "pledge" | "subscription";
type Kind = "system" | "note" | "call" | "email" | "sms" | "meeting" | "reminder";
type Act = { id: number; subjectKind: SubjectKind; subjectId: string; subjectName: string; kind: Kind; text: string; dueAt: string | null; doneAt: string | null; seen: boolean; at: string; dueIn: number | null };
type Payload = { today: string; unseen: number; overdue: number; dueToday: number; reminders: Act[]; activity: Act[] };

const ICON: Record<Kind, string> = { system: "⚡", note: "📝", call: "📞", email: "✉️", sms: "💬", meeting: "🤝", reminder: "⏰" };
const SUBJECT: Record<SubjectKind, string> = { subscriber: "Letter", mentor: "Mentor", partner: "Organisation", pledge: "Pledge", subscription: "Supporter" };
const TOUCHES: Kind[] = ["note", "call", "email", "sms", "meeting", "reminder"];
const when = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};
const due = (a: Act) => (a.dueIn === null ? "" : a.dueIn < 0 ? `${-a.dueIn}d overdue` : a.dueIn === 0 ? "today" : `in ${a.dueIn}d`);

async function call(method: "POST" | "PATCH", body: unknown) {
  const res = await fetch("/api/office/activity", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
}

/** Log a touch or a reminder against one person. Used in the drawers and on the Activity page. */
export function TouchForm({ subjectKind, subjectId, subjectName, onLogged, toast, compact = false }: { subjectKind: SubjectKind; subjectId: string; subjectName: string; onLogged: () => void; toast: (m: string) => void; compact?: boolean }) {
  const [kind, setKind] = useState<Kind>("note");
  const [text, setText] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      await call("POST", { subjectKind, subjectId, subjectName, kind, text, dueAt: kind === "reminder" ? dueAt : null });
      toast(kind === "reminder" ? "Reminder set" : "Logged");
      setText("");
      setDueAt("");
      onLogged();
    } catch (x) {
      toast((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={`touch${compact ? " compact" : ""}`} onSubmit={submit}>
      <div className="touch-kinds" role="radiogroup" aria-label="Kind">
        {TOUCHES.map((k) => (
          <button key={k} type="button" className={`pill${kind === k ? " on" : ""}`} onClick={() => setKind(k)} aria-pressed={kind === k}>{ICON[k]} {k}</button>
        ))}
      </div>
      <div className="touch-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "reminder" ? "What needs doing…" : `What happened with ${subjectName || "them"}…`} aria-label="Text" />
        {kind === "reminder" ? <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} aria-label="Due" required /> : null}
        <button type="submit" className="abtn primary" disabled={busy || !text.trim()}>{kind === "reminder" ? "Set" : "Log"}</button>
      </div>
    </form>
  );
}

/** One person's timeline with the touch form under it. */
export function Timeline({ subjectKind, subjectId, subjectName, toast }: { subjectKind: SubjectKind; subjectId: string; subjectName: string; toast: (m: string) => void }) {
  const [rows, setRows] = useState<Act[] | null>(null);
  const load = useCallback(async () => {
    const res = await fetch(`/api/office/activity?kind=${subjectKind}&id=${encodeURIComponent(subjectId)}&limit=50`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as Payload | null;
    setRows(json?.activity ?? []);
  }, [subjectKind, subjectId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const tick = async (a: Act) => {
    await call("PATCH", { id: a.id, done: !a.doneAt }).catch((x) => toast((x as Error).message));
    await load();
  };
  return (
    <div className="timeline">
      <div className="ahead"><h2>Timeline</h2><span className="quiet">{rows ? `${rows.length} ${rows.length === 1 ? "entry" : "entries"}` : "…"}</span></div>
      <TouchForm subjectKind={subjectKind} subjectId={subjectId} subjectName={subjectName} onLogged={() => void load()} toast={toast} compact />
      <ol className="tl">
        {rows === null ? <li className="quiet">Loading…</li> : rows.length === 0 ? <li className="quiet">Nothing yet.</li> : rows.map((a) => (
          <li key={a.id} className={`tl-${a.kind}${a.doneAt ? " done" : ""}`}>
            <i aria-hidden="true">{ICON[a.kind]}</i>
            <div>
              <span>{a.text}</span>
              <small>{when(a.at)}{a.kind === "reminder" && !a.doneAt ? ` · due ${a.dueAt} (${due(a)})` : ""}{a.doneAt ? " · done" : ""}</small>
            </div>
            {a.kind === "reminder" ? <button type="button" className="abtn" onClick={() => void tick(a)}>{a.doneAt ? "Undo" : "Done"}</button> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The office inbox: reminders due, then everything that happened, newest first. */
export function OfficeActivity({ toast, onChanged }: { toast: (m: string) => void; onChanged: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"todo" | "all" | Kind | SubjectKind>("todo");
  const [q, setQ] = useState("");
  const [logFor, setLogFor] = useState<{ kind: SubjectKind; id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/office/activity?limit=300", { cache: "no-store" });
      const json = (await res.json()) as Payload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `Couldn’t load activity (${res.status})`);
      setData(json);
      setError("");
    } catch (x) {
      setError((x as Error).message);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const base = view === "todo" ? data.reminders : view === "all" ? data.activity : data.activity.filter((a) => a.kind === view || a.subjectKind === view);
    const list = view === "todo" ? [...base].sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "")) : base;
    return needle ? list.filter((a) => `${a.subjectName} ${a.text}`.toLowerCase().includes(needle)) : list;
  }, [data, view, q]);

  if (error && !data) return <p className="office-empty">{error}</p>;
  if (!data) return <p className="office-empty">Opening the activity…</p>;

  const tick = async (a: Act) => {
    try {
      await call("PATCH", { id: a.id, done: !a.doneAt });
      toast(a.doneAt ? "Reopened" : "Done");
      await load();
      onChanged();
    } catch (x) {
      toast((x as Error).message);
    }
  };
  const seenAll = async () => {
    await call("PATCH", { seenAll: true }).catch(() => {});
    await load();
    onChanged();
  };

  return (
    <div className={`asplit${logFor ? " with-detail" : ""}`}>
      <div className="agrid" style={{ minWidth: 0 }}>
        <div className="akpis">
          <div className="akpi"><span>Overdue</span><b>{data.overdue}</b><em>reminders past their date</em></div>
          <div className="akpi"><span>Due today</span><b>{data.dueToday}</b><em>to do before tonight</em></div>
          <div className="akpi"><span>Open reminders</span><b>{data.reminders.length}</b><em>across everyone</em></div>
          <div className="akpi"><span>New since last look</span><b>{data.unseen}</b><em>{data.unseen ? <button type="button" className="abtn" onClick={() => void seenAll()}>Mark all seen</button> : "all caught up"}</em></div>
        </div>
        <div className="apanel span2">
          <div className="ahead">
            <h2>Activity</h2>
            <span className="quiet">every join, form, pledge and payment, and what the office did about it</span>
          </div>
          <div className="atools">
            <input className="asearch" type="search" placeholder="Search names and text…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity" />
            <div className="pool-filters" role="group" aria-label="View">
              <button type="button" className={`pill st-new${view === "todo" ? " on" : ""}`} onClick={() => setView("todo")}>To do {data.reminders.length}</button>
              <button type="button" className={`pill${view === "all" ? " on" : ""}`} onClick={() => setView("all")}>Everything</button>
              {(["mentor", "partner", "pledge", "subscription", "subscriber"] as SubjectKind[]).map((k) => <button key={k} type="button" className={`pill${view === k ? " on" : ""}`} onClick={() => setView(k)}>{SUBJECT[k]}</button>)}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="quiet">{view === "todo" ? "Nothing to do. Enjoy it." : "Nothing here yet."}</p>
          ) : (
            <ol className="tl feed">
              {rows.map((a) => (
                <li key={a.id} className={`tl-${a.kind}${a.doneAt ? " done" : ""}${!a.seen ? " new" : ""}${a.kind === "reminder" && !a.doneAt && a.dueIn !== null && a.dueIn < 0 ? " late" : ""}`}>
                  <i aria-hidden="true">{ICON[a.kind]}</i>
                  <div>
                    <span><button type="button" className="who" onClick={() => setLogFor({ kind: a.subjectKind, id: a.subjectId, name: a.subjectName })}>{a.subjectName || a.subjectId}</button> <em className="pill">{SUBJECT[a.subjectKind]}</em> {a.text}</span>
                    <small>{when(a.at)}{a.kind === "reminder" && !a.doneAt ? ` · due ${a.dueAt} (${due(a)})` : ""}{a.doneAt ? " · done" : ""}</small>
                  </div>
                  {a.kind === "reminder" ? <button type="button" className={`abtn${a.doneAt ? "" : " primary"}`} onClick={() => void tick(a)}>{a.doneAt ? "Undo" : "Done"}</button> : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      {logFor ? (
        <aside className="adetail" aria-label={`Timeline for ${logFor.name}`}>
          <div className="ahead"><h2>{logFor.name}</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setLogFor(null)}>×</button></div>
          <p className="quiet">{SUBJECT[logFor.kind]}</p>
          <Timeline subjectKind={logFor.kind} subjectId={logFor.id} subjectName={logFor.name} toast={toast} />
        </aside>
      ) : null}
    </div>
  );
}
