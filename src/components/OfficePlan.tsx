"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { INITIATIVE_KINDS, INITIATIVE_KIND_LABEL, INITIATIVE_STATUSES, INITIATIVE_STATUS_LABEL, INITIATIVE_STATUS_MEANS, isoMonth } from "@/lib/office";
import type { InitiativeKind, InitiativeStatus } from "@/lib/office";

type Initiative = {
  id: string; title: string; kind: InitiativeKind; status: InitiativeStatus; summary: string; detail: string;
  need: string; nextStep: string; goalId: string | null; href: string; since: string; updatedAt: string;
};
type Goal = { id: string; title: string };
type Note = { id: number; month: string; text: string };
type Draft = {
  id: string | null; title: string; kind: InitiativeKind; status: InitiativeStatus; summary: string; detail: string;
  need: string; nextStep: string; goalId: string; href: string; since: string;
};

const empty: Draft = { id: null, title: "", kind: "project", status: "idea", summary: "", detail: "", need: "", nextStep: "", goalId: "", href: "", since: "" };
const from = (i: Initiative): Draft => ({
  id: i.id, title: i.title, kind: i.kind, status: i.status, summary: i.summary, detail: i.detail,
  need: i.need, nextStep: i.nextStep, goalId: i.goalId ?? "", href: i.href, since: i.since,
});

async function call(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/**
 * The master plan, edited. Two things the form will not let you do, because the
 * public page depends on them: give an initiative an amount of its own (money
 * only ever comes from a goal, counted from the ledger), and fund a venture from
 * a goal at all.
 */
export function OfficePlan({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [items, setItems] = useState<Initiative[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState({ month: isoMonth(new Date()), text: "" });
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/office/initiatives", { cache: "no-store" }),
      fetch("/api/office/plan-notes", { cache: "no-store" }),
    ]);
    if (!a.ok) return setError("The plan could not be loaded.");
    const data = (await a.json()) as { initiatives: Initiative[]; goals: Goal[] };
    setItems(data.initiatives);
    setGoals(data.goals);
    if (b.ok) setNotes(((await b.json()) as { notes: Note[] }).notes);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter((i) => !needle || `${i.title} ${i.summary} ${i.detail}`.toLowerCase().includes(needle));
  }, [items, q]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    try {
      const body = { ...draft, id: draft.id ?? undefined };
      if (draft.id) await call("PATCH", "/api/office/initiatives", body);
      else await call("POST", "/api/office/initiatives", body);
      toast(draft.id ? "Plan updated" : "Added to the plan");
      setDraft(null);
      await load();
      onChanged();
    } catch (x) {
      setError((x as Error).message);
    }
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await call("POST", "/api/office/plan-notes", note);
      toast("Written into what changed");
      setNote({ month: note.month, text: "" });
      await load();
    } catch (x) {
      setError((x as Error).message);
    }
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const isVenture = draft?.kind === "venture";

  return (
    <div className="asplit">
      <div className="apanel">
        <div className="ahead">
          <h2>The master plan</h2>
          <span className="quiet">{items?.length ?? 0} on the page</span>
        </div>
        <div className="ahead">
          <input className="asearch" type="search" placeholder="Search the plan…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {error ? <p className="office-empty">{error}</p> : null}
        {!items ? (
          <p className="office-empty">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="office-empty">Nothing matches. Add the first thing below.</p>
        ) : (
          <div className="tblwrap">
            <table className="atable">
              <thead>
                <tr><th>What</th><th>Kind</th><th>Status</th><th>Funded by</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.title}</b>
                      <small>{i.summary}</small>
                    </td>
                    <td>{INITIATIVE_KIND_LABEL[i.kind]}</td>
                    <td>{INITIATIVE_STATUS_LABEL[i.status]}</td>
                    <td>
                      {i.kind === "venture" ? (
                        <span className="quiet">never donated money</span>
                      ) : i.goalId ? (
                        goals.find((g) => g.id === i.goalId)?.title ?? i.goalId
                      ) : (
                        <span className="quiet">—</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="abtn" onClick={() => { setError(""); setDraft(from(i)); }}>Edit</button>{" "}
                      <button
                        type="button"
                        className="abtn"
                        onClick={() => {
                          if (!confirm(`Take "${i.title}" off the plan? It goes for good.`)) return;
                          void call("DELETE", `/api/office/initiatives?id=${encodeURIComponent(i.id)}`)
                            .then(() => { toast("Taken off the plan"); return load(); })
                            .then(onChanged)
                            .catch((x) => setError((x as Error).message));
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button type="button" className="abtn primary" onClick={() => { setError(""); setDraft({ ...empty }); }}>
          Add to the plan
        </button>

        <div className="ahead" style={{ marginTop: "1.6rem" }}>
          <h2>What changed</h2>
          <span className="quiet">{notes.length} written down</span>
        </div>
        <p className="quiet">One line per thing that actually changed. The newest month shows at the top of the public page.</p>
        <form onSubmit={addNote} className="aform">
          <label>Month<input value={note.month} onChange={(e) => setNote({ ...note, month: e.target.value })} placeholder="2026-09" required /></label>
          <label>What changed<textarea rows={2} value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} required /></label>
          <div className="arow"><button type="submit" className="abtn primary">Write it down</button></div>
        </form>
        {notes.length ? (
          <ul className="plan-notes-admin">
            {notes.map((n) => (
              <li key={n.id}>
                <b>{n.month}</b> {n.text}{" "}
                <button
                  type="button"
                  className="abtn"
                  onClick={() => {
                    if (!confirm("Remove this line?")) return;
                    void call("DELETE", `/api/office/plan-notes?id=${n.id}`)
                      .then(() => { toast("Line removed"); return load(); })
                      .catch((x) => setError((x as Error).message));
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {draft ? (
        <aside className="adetail" aria-label={draft.id ? "Correct this" : "Add to the plan"}>
          <div className="ahead">
            <h2>{draft.id ? "Correct this" : "Add to the plan"}</h2>
            <button type="button" className="aclose" aria-label="Close" onClick={() => setDraft(null)}>×</button>
          </div>
          <p className="quiet">Put it at the status it has actually earned. An idea stays an idea until there is something real to point at.</p>
          <form onSubmit={save} className="aform">
            <label>Name<input value={draft.title} onChange={(e) => set("title", e.target.value)} required /></label>
            <label>
              Kind
              <select value={draft.kind} onChange={(e) => set("kind", e.target.value as InitiativeKind)}>
                {INITIATIVE_KINDS.map((k) => (
                  <option key={k} value={k}>{INITIATIVE_KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={draft.status} onChange={(e) => set("status", e.target.value as InitiativeStatus)}>
                {INITIATIVE_STATUSES.map((s) => (
                  <option key={s} value={s}>{INITIATIVE_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <p className="quiet">{INITIATIVE_STATUS_MEANS[draft.status]}</p>
            <label>In one line<input value={draft.summary} onChange={(e) => set("summary", e.target.value)} required /></label>
            <label>The whole of it<textarea rows={5} value={draft.detail} onChange={(e) => set("detail", e.target.value)} /></label>
            <label>What it would take<textarea rows={2} value={draft.need} onChange={(e) => set("need", e.target.value)} /></label>
            <label>The next step<input value={draft.nextStep} onChange={(e) => set("nextStep", e.target.value)} /></label>
            <label>
              Funded by
              <select value={draft.goalId} onChange={(e) => set("goalId", e.target.value)} disabled={isVenture}>
                <option value="">Nothing yet</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </label>
            <p className="quiet">
              {isVenture
                ? "A venture is funded separately and never from donated money, so it cannot point at a goal."
                : "The amounts on the public page come from this goal's lines in the ledger. There is nowhere to type a figure, on purpose."}
            </p>
            <label>Since<input value={draft.since} onChange={(e) => set("since", e.target.value)} placeholder="2026" /></label>
            <label>Link (optional)<input value={draft.href} onChange={(e) => set("href", e.target.value)} placeholder="/campaigns/a-year-covered" /></label>
            <div className="arow">
              <button type="submit" className="abtn primary">{draft.id ? "Save" : "Add"}</button>
              <button type="button" className="abtn" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
