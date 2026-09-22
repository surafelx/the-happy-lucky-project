"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Timeline } from "@/components/OfficeActivity";

type Status = "pledged" | "sent" | "received";
type Pledge = {
  id: string;
  at: string;
  source: "site" | "office";
  name: string;
  email: string;
  phone: string;
  tier: string;
  amount: number;
  anonymous: boolean;
  note: string;
  status: Status;
  updatedAt: string;
  proof: { link: string; ref: string; at: string; image: string | null } | null;
};
type Payload = {
  campaign: {
    key: string;
    title: string;
    home: string;
    confirmed: boolean;
    plan: { women: number; packsPerMonth: number; pricePerPack: number; months: number; bufferPct: number };
    math: { packs: number; perWomanMonth: number; perWomanYear: number; goal: number };
    tiers: string[];
  };
  totals: { pledged: number; received: number; count: number; pct: number; womenCovered: number; remaining: number };
  pledges: Pledge[];
};
type Draft = { id: string | null; name: string; email: string; phone: string; tier: string; amount: string; anonymous: boolean; note: string; status: Status };

const LABEL: Record<Status, string> = { pledged: "Pledged", sent: "To verify", received: "Received" };
const PILL: Record<Status, string> = { pledged: "st-new", sent: "st-contacted", received: "st-active" };
const fmt = (n: number) => n.toLocaleString("en-US");
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

async function call(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
}

/** Pledges in the office: list, add, edit, verify and delete. */
export function OfficePledges({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/office/pledges", { cache: "no-store" });
      const json = (await res.json()) as Payload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `Couldn’t load pledges (${res.status})`);
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
    return data.pledges.filter(
      (p) => (filter === "all" || p.status === filter) && (!needle || `${p.name} ${p.email} ${p.phone} ${p.tier} ${p.proof?.ref ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [data, q, filter]);

  if (error && !data) return <p className="office-empty">{error}</p>;
  if (!data) return <p className="office-empty">Opening the pledges…</p>;

  const { campaign, totals } = data;
  const amounts: Record<string, number | null> = {
    [campaign.tiers[0]]: campaign.math.perWomanMonth,
    [campaign.tiers[1]]: campaign.math.perWomanYear,
    [campaign.tiers[2]]: campaign.math.perWomanYear * 5,
  };
  const current = draft?.id ? data.pledges.find((p) => p.id === draft.id) ?? null : null;
  const count = (s: Status) => data.pledges.filter((p) => p.status === s).length;

  const open = (p: Pledge) => {
    setFormError("");
    setConfirmDelete(false);
    setDraft({ id: p.id, name: p.name, email: p.email, phone: p.phone, tier: p.tier, amount: String(p.amount), anonymous: p.anonymous, note: p.note, status: p.status });
  };
  const blank = () => {
    setFormError("");
    setConfirmDelete(false);
    setDraft({ id: null, name: "", email: "", phone: "", tier: campaign.tiers[1], amount: String(campaign.math.perWomanYear), anonymous: false, note: "", status: "received" });
  };
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const run = async (work: () => Promise<void>, ok: string, close = false) => {
    setSaving(true);
    setFormError("");
    try {
      await work();
      toast(ok);
      if (close) setDraft(null);
      await load();
      onChanged();
    } catch (x) {
      setFormError((x as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!draft || saving) return;
    const body = { name: draft.name, email: draft.email, phone: draft.phone, tier: draft.tier, amount: Number(draft.amount), anonymous: draft.anonymous, note: draft.note, status: draft.status };
    void run(
      () => (draft.id ? call("PATCH", "/api/office/pledges", { id: draft.id, ...body }) : call("POST", "/api/office/pledges", body)),
      draft.id ? "Pledge saved" : "Pledge added",
      !draft.id,
    );
  };

  const quick = (p: Pledge, status: Status) =>
    void run(() => call("PATCH", "/api/office/pledges", { id: p.id, status }), status === "received" ? `${p.name.split(" ")[0]}’s gift received` : `Back to ${LABEL[status].toLowerCase()}`);

  return (
    <div className={`asplit${draft ? " with-detail" : ""}`}>
      <div className="agrid" style={{ minWidth: 0 }}>
        <div className="akpis">
          <div className="akpi"><span>Goal</span><b>{fmt(campaign.math.goal)}<small> ETB</small></b><em>{campaign.plan.women} women · {campaign.plan.months} months</em></div>
          <div className="akpi"><span>Pledged</span><b>{fmt(totals.pledged)}<small> ETB</small></b><em>{totals.pct}% · {totals.count} {totals.count === 1 ? "pledge" : "pledges"}</em></div>
          <div className="akpi"><span>Received</span><b>{fmt(totals.received)}<small> ETB</small></b><em>{fmt(totals.pledged - totals.received)} still to collect</em></div>
          <div className="akpi"><span>Women covered</span><b>{totals.womenCovered}<small> of {campaign.plan.women}</small></b><em>{fmt(campaign.math.perWomanYear)} ETB each for the year</em></div>
        </div>

        <div className="apanel span2">
          <div className="ahead">
            <h2>{campaign.title}</h2>
            <span className="quiet">for {campaign.home}{campaign.confirmed ? "" : " · draft numbers"}</span>
            <a className="abtn" href={`/campaigns/${campaign.key}`} target="_blank" rel="noreferrer" style={{ marginLeft: "auto" }}>Open the page ↗</a>
            <button type="button" className="abtn primary" onClick={blank}>+ Add a pledge</button>
          </div>
          <div className="bar-track"><b style={{ width: `${totals.pct}%`, background: "var(--rose)" }} /></div>

          <div className="atools">
            <input className="asearch" type="search" placeholder="Search name, email, reference…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search pledges" />
            <div className="pool-filters" role="group" aria-label="Status">
              <button type="button" className={`pill${filter === "all" ? " on" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {data.pledges.length}</button>
              {(["pledged", "sent", "received"] as const).map((s) => (
                <button key={s} type="button" className={`pill ${PILL[s]}${filter === s ? " on" : ""}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>{LABEL[s]} {count(s)}</button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="quiet">{data.pledges.length === 0 ? "No pledges yet. Share the page, or add one you received in person." : "Nothing matches that."}</p>
          ) : (
            <div className="tblwrap">
              <table className="atable">
                <thead><tr><th>Who</th><th>Covers</th><th>When</th><th className="r">Amount</th><th>Proof</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className={draft?.id === p.id ? "open" : ""} onClick={() => open(p)}>
                      <td>
                        <b>{p.name}</b>
                        {p.anonymous ? <span className="pill">anonymous</span> : null}
                        {p.source === "office" ? <span className="pill">added by office</span> : null}
                        <span className="sub">{[p.email, p.phone].filter(Boolean).join(" · ") || "no contact"}</span>
                      </td>
                      <td>{p.tier}</td>
                      <td>{shortDay(p.at)}</td>
                      <td className="r num">{fmt(p.amount)} ETB</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {p.proof ? (
                          <span className="proof-cell">
                            {p.proof.image ? <a href={p.proof.image} target="_blank" rel="noreferrer">📸 Screenshot</a> : null}
                            {p.proof.link ? <a href={p.proof.link} target="_blank" rel="noopener noreferrer nofollow">🔗 Receipt link</a> : null}
                            {p.proof.ref ? <span className="sub mono">ref {p.proof.ref}</span> : null}
                          </span>
                        ) : (
                          <span className="quiet">none yet</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <span className={`pill ${PILL[p.status]}`}>{LABEL[p.status]}</span>
                        {p.status !== "received" ? (
                          <button type="button" className="abtn" disabled={saving} onClick={() => quick(p, "received")}>{p.status === "sent" ? "Verified" : "Mark received"}</button>
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

      {draft ? (
        <aside className="adetail" aria-label={draft.id ? "Edit pledge" : "Add a pledge"}>
          <div className="ahead">
            <h2>{draft.id ? "Edit pledge" : "Add a pledge"}</h2>
            <button type="button" className="aclose" aria-label="Close" onClick={() => setDraft(null)}>×</button>
          </div>
          <p className="quiet">
            {current ? `${current.source === "office" ? "Added by the office" : "From the site"} · ${shortDay(current.at)} · updated ${shortDay(current.updatedAt)}` : "For a gift that never went through the site, like cash handed over in person."}
          </p>

          {current?.proof ? (
            <div className="aproof">
              <b>Payment proof</b>
              {current.proof.image ? (
                <a href={current.proof.image} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private file served only to the office */}
                  <img src={current.proof.image} alt={`Receipt screenshot from ${current.name}`} />
                </a>
              ) : null}
              {current.proof.link ? <a href={current.proof.link} target="_blank" rel="noopener noreferrer nofollow">🔗 {current.proof.link}</a> : null}
              <span className="quiet">{current.proof.ref ? `ref ${current.proof.ref} · ` : ""}sent {shortDay(current.proof.at)}</span>
            </div>
          ) : null}

          <form className="aform" onSubmit={save} noValidate>
            <label className="field"><span>Name</span><input value={draft.name} onChange={(e) => set("name", e.target.value)} required /></label>
            <label className="field"><span>Email <em>(optional here)</em></span><input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} /></label>
            <label className="field"><span>Phone</span><input type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} /></label>
            <label className="field">
              <span>Covers</span>
              <select
                value={draft.tier}
                onChange={(e) => {
                  const fixed = amounts[e.target.value];
                  setDraft((d) => (d ? { ...d, tier: e.target.value, amount: fixed ? String(fixed) : d.amount } : d));
                }}
              >
                {campaign.tiers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="field"><span>Amount in birr</span><input type="number" min={10} inputMode="numeric" value={draft.amount} onChange={(e) => set("amount", e.target.value)} required /></label>
            <label className="field">
              <span>Status</span>
              <select value={draft.status} onChange={(e) => set("status", e.target.value as Status)}>
                {(["pledged", "sent", "received"] as const).map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </label>
            <label className="field"><span>Note</span><textarea rows={3} value={draft.note} onChange={(e) => set("note", e.target.value)} /></label>
            <label className="acheck"><input type="checkbox" checked={draft.anonymous} onChange={(e) => set("anonymous", e.target.checked)} /> Keep the name private on published receipts</label>

            {formError ? <p className="aerror" role="alert">{formError}</p> : null}
            <div className="aform-actions">
              <button type="submit" className="abtn primary" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Add pledge"}</button>
              {draft.id ? (
                confirmDelete ? (
                  <>
                    <button type="button" className="abtn danger" disabled={saving} onClick={() => void run(() => call("DELETE", `/api/office/pledges?id=${encodeURIComponent(draft.id!)}`), "Pledge deleted", true)}>Yes, delete it</button>
                    <button type="button" className="abtn" onClick={() => setConfirmDelete(false)}>Keep it</button>
                  </>
                ) : (
                  <button type="button" className="abtn danger ghost" onClick={() => setConfirmDelete(true)}>Delete</button>
                )
              ) : null}
            </div>
          </form>
          {current ? <Timeline subjectKind="pledge" subjectId={current.id} subjectName={current.name} toast={toast} /> : null}
        </aside>
      ) : null}
    </div>
  );
}
