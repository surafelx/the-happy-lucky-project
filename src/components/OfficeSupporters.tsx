"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Timeline } from "@/components/OfficeActivity";

type Status = "pending" | "active" | "paused" | "cancelled";
type Sub = { id: string; name: string; email: string; phone: string; plan: string; planName: string; amount: number; method: string; anonymous: boolean; note: string; status: Status; statusLabel: string; startedAt: string | null; nextDue: string | null; dueIn: number | null; paidMonths: number; at: string };
type Payload = { today: string; plans: { key: string; name: string; amount: number; emoji: string; what: string }[]; totals: { active: number; pending: number; monthly: number; due: number }; subscriptions: Sub[] };

const PILL: Record<Status, string> = { pending: "st-new", active: "st-active", paused: "st-contacted", cancelled: "" };
const fmt = (n: number) => n.toLocaleString("en-US");
const day = (iso: string | null) => (iso ? new Date(iso.length > 10 ? iso : iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

async function call(method: "POST" | "PATCH", body: unknown) {
  const res = await fetch("/api/office/subscriptions", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
}

/** Monthly supporters: who is on which plan, who is due, and a button to confirm each month's payment. */
export function OfficeSupporters({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status | "all" | "due">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", plan: "club", method: "telebirr", note: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/office/subscriptions", { cache: "no-store" });
      const json = (await res.json()) as Payload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `Couldn’t load supporters (${res.status})`);
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
    return data.subscriptions.filter((s) => {
      const okFilter = filter === "all" ? true : filter === "due" ? s.status === "pending" || (s.status === "active" && s.dueIn !== null && s.dueIn <= 0) : s.status === filter;
      return okFilter && (!needle || `${s.name} ${s.email} ${s.phone} ${s.planName}`.toLowerCase().includes(needle));
    });
  }, [data, q, filter]);

  if (error && !data) return <p className="office-empty">{error}</p>;
  if (!data) return <p className="office-empty">Opening the supporters…</p>;
  const sel = openId ? data.subscriptions.find((s) => s.id === openId) ?? null : null;

  const run = async (work: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await work();
      toast(ok);
      await load();
      onChanged();
    } catch (x) {
      toast((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(() => call("POST", draft), "Supporter added").then(() => {
      setAdding(false);
      setDraft({ name: "", email: "", phone: "", plan: "club", method: "telebirr", note: "" });
    });
  };
  const count = (s: Status) => data.subscriptions.filter((x) => x.status === s).length;

  return (
    <div className={`asplit${sel || adding ? " with-detail" : ""}`}>
      <div className="agrid" style={{ minWidth: 0 }}>
        <div className="akpis">
          <div className="akpi"><span>Active supporters</span><b>{data.totals.active}</b><em>{data.totals.pending} awaiting a first payment</em></div>
          <div className="akpi"><span>Each month</span><b>{fmt(data.totals.monthly)}<small> ETB</small></b><em>from active plans</em></div>
          <div className="akpi"><span>Due now</span><b>{data.totals.due}</b><em>payments to confirm</em></div>
          <div className="akpi"><span>Plans</span><b>{data.plans.length}</b><em>{data.plans.map((p) => p.name).join(" · ")}</em></div>
        </div>
        <div className="apanel span2">
          <div className="ahead">
            <h2>Supporters</h2>
            <span className="quiet">no money moves through the site; confirm each month here</span>
            <button type="button" className="abtn primary" style={{ marginLeft: "auto" }} onClick={() => { setOpenId(null); setAdding(true); }}>+ Add a supporter</button>
          </div>
          <div className="atools">
            <input className="asearch" type="search" placeholder="Search name, email, plan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search supporters" />
            <div className="pool-filters" role="group" aria-label="Filter">
              <button type="button" className={`pill${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All {data.subscriptions.length}</button>
              <button type="button" className={`pill st-new${filter === "due" ? " on" : ""}`} onClick={() => setFilter("due")}>Due {data.totals.due + data.totals.pending}</button>
              {(["active", "paused", "cancelled"] as const).map((s) => <button key={s} type="button" className={`pill ${PILL[s]}${filter === s ? " on" : ""}`} onClick={() => setFilter(s)}>{s[0].toUpperCase() + s.slice(1)} {count(s)}</button>)}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="quiet">{data.subscriptions.length === 0 ? "No supporters yet. Share the Give page." : "Nothing matches that."}</p>
          ) : (
            <div className="tblwrap">
              <table className="atable">
                <thead><tr><th>Who</th><th>Plan</th><th>Months</th><th>Next due</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className={openId === s.id ? "open" : ""} onClick={() => { setAdding(false); setOpenId(openId === s.id ? null : s.id); }}>
                      <td><b>{s.name}</b>{s.anonymous ? <span className="pill">anonymous</span> : null}<span className="sub">{[s.email, s.phone].filter(Boolean).join(" · ")}</span></td>
                      <td>{s.planName}<span className="sub">{fmt(s.amount)} ETB · {s.method}</span></td>
                      <td className="num">{s.paidMonths}</td>
                      <td>{s.nextDue ? <>{day(s.nextDue)}{s.dueIn !== null && s.dueIn <= 0 && s.status === "active" ? <span className="pill st-new">due</span> : null}</> : <span className="quiet">—</span>}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <span className={`pill ${PILL[s.status]}`}>{s.statusLabel}</span>
                        {s.status === "pending" || (s.status === "active" && s.dueIn !== null && s.dueIn <= 0) ? (
                          <button type="button" className="abtn" disabled={busy} onClick={() => void run(() => call("PATCH", { id: s.id, paid: true }), `${s.name.split(" ")[0]}: month ${s.paidMonths + 1} received`)}>{s.status === "pending" ? "First payment in" : "This month in"}</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {adding ? (
        <aside className="adetail" aria-label="Add a supporter">
          <div className="ahead"><h2>Add a supporter</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setAdding(false)}>×</button></div>
          <p className="quiet">For someone who arranged it in person or by phone.</p>
          <form className="aform" onSubmit={add}>
            <label className="field"><span>Name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label>
            <label className="field"><span>Email <em>(optional)</em></span><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
            <label className="field"><span>Phone</span><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
            <label className="field"><span>Plan</span><select value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })}>{data.plans.map((p) => <option key={p.key} value={p.key}>{p.name} · {fmt(p.amount)} ETB</option>)}</select></label>
            <label className="field"><span>Pays by</span><select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })}><option value="telebirr">Telebirr</option><option value="bank">Bank transfer</option></select></label>
            <label className="field"><span>Note</span><textarea rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
            <div className="aform-actions"><button type="submit" className="abtn primary" disabled={busy}>Add supporter</button></div>
          </form>
        </aside>
      ) : sel ? (
        <aside className="adetail" aria-label={`${sel.name}`}>
          <div className="ahead"><h2>{sel.name}</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setOpenId(null)}>×</button></div>
          <p className="quiet">{sel.planName} · {fmt(sel.amount)} ETB a month · {sel.method} · since {day(sel.at)}</p>
          <dl className="adl">
            <dt>Contact</dt><dd>{sel.email ? <a href={`mailto:${sel.email}`}>{sel.email}</a> : <span className="quiet">no email</span>}{sel.phone ? ` · ${sel.phone}` : ""}</dd>
            <dt>Paid</dt><dd>{sel.paidMonths} {sel.paidMonths === 1 ? "month" : "months"}{sel.startedAt ? ` · started ${day(sel.startedAt)}` : ""}</dd>
            <dt>Next due</dt><dd>{sel.nextDue ? `${day(sel.nextDue)} (${sel.dueIn !== null && sel.dueIn < 0 ? `${-sel.dueIn} days overdue` : sel.dueIn === 0 ? "today" : `in ${sel.dueIn} days`})` : "—"}</dd>
            {sel.note ? <><dt>Their note</dt><dd className="their-note">“{sel.note}”</dd></> : null}
          </dl>
          <div className="aform-actions">
            {sel.status !== "cancelled" ? <button type="button" className="abtn primary" disabled={busy} onClick={() => void run(() => call("PATCH", { id: sel.id, paid: true }), `${sel.name.split(" ")[0]}: month ${sel.paidMonths + 1} received`)}>Payment received</button> : null}
            {sel.status === "active" ? <button type="button" className="abtn" disabled={busy} onClick={() => void run(() => call("PATCH", { id: sel.id, status: "paused" }), "Paused")}>Pause</button> : null}
            {sel.status === "paused" ? <button type="button" className="abtn" disabled={busy} onClick={() => void run(() => call("PATCH", { id: sel.id, status: "active" }), "Active again")}>Resume</button> : null}
            {sel.status !== "cancelled" ? <button type="button" className="abtn danger ghost" disabled={busy} onClick={() => void run(() => call("PATCH", { id: sel.id, status: "cancelled" }), "Cancelled")}>Cancel plan</button> : <button type="button" className="abtn" disabled={busy} onClick={() => void run(() => call("PATCH", { id: sel.id, status: "pending" }), "Back to pending")}>Reopen</button>}
          </div>
          <Timeline subjectKind="subscription" subjectId={sel.id} subjectName={sel.name} toast={toast} />
        </aside>
      ) : null}
    </div>
  );
}
