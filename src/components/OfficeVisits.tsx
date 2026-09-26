"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { WORK_KINDS } from "@/lib/office";
import type { WorkKind } from "@/lib/office";

type Visit = {
  id: string; name: string; kind: WorkKind; town: string; lon: number; lat: number; since: string; what: string;
  reached: number | null; href: string; now: boolean; example: boolean;
};
type Draft = {
  id: string | null; name: string; kind: WorkKind; town: string; lon: string; lat: string;
  since: string; what: string; reached: string; href: string; now: boolean; example: boolean;
};

const empty: Draft = { id: null, name: "", kind: "School", town: "", lon: "", lat: "", since: "", what: "", reached: "", href: "", now: false, example: false };
const from = (v: Visit): Draft => ({
  id: v.id, name: v.name, kind: v.kind, town: v.town, lon: String(v.lon), lat: String(v.lat),
  since: v.since, what: v.what, reached: v.reached === null ? "" : String(v.reached), href: v.href, now: v.now, example: v.example,
});

async function call(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** The pins on the map on /visits: what is there, and adding or correcting one. */
export function OfficeVisits({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/office/visits", { cache: "no-store" });
    if (!res.ok) return setError("The visits could not be loaded.");
    setVisits(((await res.json()) as { visits: Visit[] }).visits);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (visits ?? []).filter((v) => !needle || `${v.name} ${v.town} ${v.what}`.toLowerCase().includes(needle));
  }, [visits, q]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const body = { ...draft, id: draft.id ?? undefined, reached: draft.reached };
    try {
      if (draft.id) await call("PATCH", "/api/office/visits", body);
      else await call("POST", "/api/office/visits", body);
      toast(draft.id ? "Place corrected" : "Place added to the map");
      setDraft(null);
      await load();
      onChanged();
    } catch (x) {
      setError((x as Error).message);
    }
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="asplit">
      <div className="apanel">
        <div className="ahead">
          <h2>Visits</h2>
          <span className="quiet">{visits?.length ?? 0} on the map</span>
        </div>
        <div className="ahead">
          <input className="asearch" type="search" placeholder="Search place, town…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {error ? <p className="office-empty">{error}</p> : null}
        {!visits ? (
          <p className="office-empty">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="office-empty">No place matches. Add the first one below.</p>
        ) : (
          <div className="tblwrap">
            <table className="atable">
              <thead>
                <tr><th>Place</th><th>Town</th><th>Kind</th><th>Since</th><th>Reached</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <b>{v.name}</b>
                      {v.now ? <em className="tag now">now</em> : null}
                      {v.example ? <em className="tag">example</em> : null}
                      <small>{v.what}</small>
                    </td>
                    <td>{v.town}</td>
                    <td>{v.kind}</td>
                    <td>{v.since || <span className="quiet">—</span>}</td>
                    <td className="num">{v.reached ?? <span className="quiet">—</span>}</td>
                    <td>
                      <button type="button" className="abtn" onClick={() => { setError(""); setDraft(from(v)); }}>Edit</button>{" "}
                      <button
                        type="button"
                        className="abtn"
                        onClick={() => {
                          if (!confirm(`Take ${v.name} off the map? It goes for good.`)) return;
                          void call("DELETE", `/api/office/visits?id=${encodeURIComponent(v.id)}`)
                            .then(() => { toast("Place removed"); return load(); })
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
          Add a place
        </button>
      </div>

      {draft ? (
        <aside className="adetail" aria-label={draft.id ? "Correct this place" : "Add a place"}>
          <div className="ahead">
            <h2>{draft.id ? "Correct this place" : "Add a place"}</h2>
            <button type="button" className="aclose" aria-label="Close" onClick={() => setDraft(null)}>×</button>
          </div>
          <p className="quiet">Only put a pin somewhere we have actually been.</p>
          <form onSubmit={save} className="aform">
            <label>Name<input value={draft.name} onChange={(e) => set("name", e.target.value)} required /></label>
            <label>
              Kind
              <select value={draft.kind} onChange={(e) => set("kind", e.target.value as WorkKind)}>
                {WORK_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>Town<input value={draft.town} onChange={(e) => set("town", e.target.value)} required /></label>
            <label>
              Longitude
              <input value={draft.lon} onChange={(e) => set("lon", e.target.value)} inputMode="decimal" placeholder="37.39" required />
            </label>
            <label>
              Latitude
              <input value={draft.lat} onChange={(e) => set("lat", e.target.value)} inputMode="decimal" placeholder="11.59" required />
            </label>
            <p className="quiet">
              Google Maps shows latitude first; the form wants longitude first. Right-click the spot and copy both numbers.
            </p>
            <label>Since<input value={draft.since} onChange={(e) => set("since", e.target.value)} placeholder="2026" /></label>
            <label>
              What happened there
              <textarea rows={4} value={draft.what} onChange={(e) => set("what", e.target.value)} />
            </label>
            <label>How many reached<input value={draft.reached} onChange={(e) => set("reached", e.target.value)} inputMode="numeric" placeholder="leave empty if none" /></label>
            <label>Link (optional)<input value={draft.href} onChange={(e) => set("href", e.target.value)} placeholder="/campaigns/a-year-covered" /></label>
            <label className="check"><input type="checkbox" checked={draft.now} onChange={(e) => set("now", e.target.checked)} /> Happening now</label>
            <label className="check"><input type="checkbox" checked={draft.example} onChange={(e) => set("example", e.target.checked)} /> This is an example</label>
            <div className="arow">
              <button type="submit" className="abtn primary">{draft.id ? "Save" : "Add to the map"}</button>
              <button type="button" className="abtn" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
