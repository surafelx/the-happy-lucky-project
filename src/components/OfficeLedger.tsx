"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { shrinkImage } from "@/lib/image";

type Kind = "in" | "out" | "inkind";
type Entry = { id: number; ref: string; kind: Kind; amount: number; name: string; anonymous: boolean; goalId: string | null; method: string; note: string; items: string; recipient: string; receipt: string | null; occurredAt: string; at: string };
type Goal = { id: string; title: string; target: number; color: string; about: string; plan: string; status: "open" | "done"; raised: number; spent: number; remaining: number; pct: number };
type Payload = { totals: { in: number; out: number; balance: number; count: number; needed: number; inKind: { value: number; count: number } }; goals: Goal[]; entries: Entry[]; colors: string[]; methods: { key: string; label: string }[] };

type EntryDraft = { kind: Kind; amount: string; name: string; anonymous: boolean; goalId: string; method: string; note: string; items: string; recipient: string; when: string; image: string; removeReceipt: boolean };
type GoalDraft = { title: string; target: string; color: string; about: string; plan: string; status: "open" | "done" };

const fmt = (n: number) => n.toLocaleString("en-US");
/** An ISO timestamp as the value a datetime-local input wants, in local time. */
const localInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const blankEntry = (): EntryDraft => ({ kind: "in", amount: "", name: "", anonymous: false, goalId: "", method: "telebirr", note: "", items: "", recipient: "", when: localInput(new Date().toISOString()), image: "", removeReceipt: false });

async function call(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; entry?: Entry };
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/**
 * The ledger behind the public open books page. Every gift and every payment
 * is logged here by hand; nothing is connected to a bank. What is saved here
 * shows on the public page within a few seconds.
 */
export function OfficeLedger({ toast, onChanged }: { toast: (msg: string) => void; onChanged: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [side, setSide] = useState<{ type: "entry"; id: number | null } | { type: "goal"; id: string | null } | null>(null);
  const [entry, setEntry] = useState<EntryDraft>(blankEntry);
  const [goal, setGoal] = useState<GoalDraft>({ title: "", target: "", color: "", about: "", plan: "", status: "open" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/office/ledger", { cache: "no-store" });
      const json = (await res.json()) as Payload & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || `Couldn’t load the ledger (${res.status})`);
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
    return data.entries.filter((e) => (filter === "all" || e.kind === filter) && (!needle || `${e.ref} ${e.name} ${e.note}`.toLowerCase().includes(needle)));
  }, [data, q, filter]);

  if (error && !data) return <p className="office-empty">{error}</p>;
  if (!data) return <p className="office-empty">Opening the ledger…</p>;
  const goalTitle = (id: string | null) => (id ? data.goals.find((g) => g.id === id)?.title ?? "—" : "General fund");

  const run = async (work: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await work();
      toast(ok);
      await load();
      onChanged();
      return true;
    } catch (x) {
      toast((x as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openEntry = (e: Entry | null) => {
    setSide({ type: "entry", id: e?.id ?? null });
    setEntry(
      e
        ? { kind: e.kind, amount: String(e.amount), name: e.name, anonymous: e.anonymous, goalId: e.goalId ?? "", method: e.method, note: e.note, items: e.items, recipient: e.recipient, when: localInput(e.occurredAt), image: "", removeReceipt: false }
        : blankEntry(),
    );
  };
  const openGoal = (g: Goal | null) => {
    setSide({ type: "goal", id: g?.id ?? null });
    setGoal(
      g
        ? { title: g.title, target: String(g.target), color: g.color, about: g.about, plan: g.plan, status: g.status }
        : { title: "", target: "", color: data.colors[data.goals.length % data.colors.length], about: "", plan: "", status: "open" },
    );
  };

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      // Big enough to read the small print on a bank slip, small enough to upload on a phone.
      setEntry((d) => ({ ...d, image: "", removeReceipt: false }));
      const image = await shrinkImage(file, 1600, 0.8);
      setEntry((d) => ({ ...d, image }));
    } catch {
      toast("That file couldn’t be read as a photo.");
    }
  };

  const current = side?.type === "entry" && side.id !== null ? data.entries.find((e) => e.id === side.id) ?? null : null;
  const saveEntry = (ev: FormEvent) => {
    ev.preventDefault();
    const body = {
      id: current?.id,
      kind: entry.kind,
      amount: Number(entry.amount),
      name: entry.name,
      anonymous: entry.anonymous,
      goalId: entry.goalId,
      method: entry.method,
      note: entry.note,
      items: entry.items,
      recipient: entry.recipient,
      occurredAt: new Date(entry.when).toISOString(),
      image: entry.image || undefined,
      removeReceipt: entry.removeReceipt,
    };
    const added = entry.kind === "in" ? "Gift logged. It’s on the page now." : entry.kind === "out" ? "Payment logged" : "Gift in kind logged";
    void run(() => call("/api/office/ledger", current ? "PATCH" : "POST", body), current ? "Entry updated" : added).then((ok) => {
      if (ok) setSide(null);
    });
  };
  const removeEntry = (e: Entry) => {
    if (!window.confirm(`Take ${e.ref} (${fmt(e.amount)} ETB, ${e.name}) off the public page and out of the totals?`)) return;
    void run(() => call(`/api/office/ledger?id=${e.id}`, "DELETE"), "Entry removed").then((ok) => {
      if (ok) setSide(null);
    });
  };

  const currentGoal = side?.type === "goal" && side.id ? data.goals.find((g) => g.id === side.id) ?? null : null;
  const saveGoal = (ev: FormEvent) => {
    ev.preventDefault();
    const body = { id: currentGoal?.id, ...goal, target: Number(goal.target) };
    void run(() => call("/api/office/goals", currentGoal ? "PATCH" : "POST", body), currentGoal ? "Goal updated" : "Goal added").then((ok) => {
      if (ok) setSide(null);
    });
  };

  const t = data.totals;
  return (
    <div className={`asplit${side ? " with-detail" : ""}`}>
      <div className="agrid" style={{ minWidth: 0 }}>
        <div className="akpis">
          <div className="akpi"><span>Balance</span><b className="num">{fmt(t.balance)}<small> ETB</small></b><em>money in minus money out</em></div>
          <div className="akpi"><span>Money in</span><b className="num">{fmt(t.in)}<small> ETB</small></b><em>{data.entries.filter((e) => e.kind === "in").length} gifts</em></div>
          <div className="akpi"><span>Money out</span><b className="num">{fmt(t.out)}<small> ETB</small></b><em>{data.entries.filter((e) => e.kind === "out").length} payments</em></div>
          <div className="akpi"><span>Given in kind</span><b className="num">{fmt(t.inKind.value)}<small> ETB</small></b><em>{t.inKind.count} {t.inKind.count === 1 ? "gift" : "gifts"} of goods</em></div>
          <div className="akpi"><span>Still needed</span><b className="num">{fmt(t.needed)}<small> ETB</small></b><em>across open goals</em></div>
        </div>

        <div className="apanel span2">
          <div className="ahead">
            <h2>Ledger</h2>
            <span className="quiet">everything here is public on <a href="/audit" target="_blank" rel="noopener">the audit page</a>, except hidden names</span>
            <button type="button" className="abtn primary" style={{ marginLeft: "auto" }} onClick={() => openEntry(null)}>+ Log money</button>
          </div>
          <div className="atools">
            <input className="asearch" type="search" placeholder="Search name, receipt number, note…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the ledger" />
            <div className="pool-filters" role="group" aria-label="Filter">
              <button type="button" className={`pill${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All {data.entries.length}</button>
              <button type="button" className={`pill st-active${filter === "in" ? " on" : ""}`} onClick={() => setFilter("in")}>In</button>
              <button type="button" className={`pill st-contacted${filter === "out" ? " on" : ""}`} onClick={() => setFilter("out")}>Out</button>
            <button type="button" className={`pill${filter === "inkind" ? " on" : ""}`} onClick={() => setFilter("inkind")}>In kind</button>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="quiet">{data.entries.length === 0 ? "Nothing logged yet. Start with the money you have now, as one “in” entry named “Starting balance”." : "Nothing matches that."}</p>
          ) : (
            <div className="tblwrap">
              <table className="atable">
                <thead><tr><th>Receipt</th><th>Who</th><th>For</th><th>When</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className={side?.type === "entry" && side.id === e.id ? "open" : ""} onClick={() => openEntry(e)}>
                      <td className="mono">{e.ref}{e.receipt ? <span className="pill" title="Receipt photo published">🧾</span> : null}</td>
                      <td><b>{e.name}</b>{e.anonymous ? <span className="pill">hidden</span> : null}{e.kind === "inkind" ? <span className="sub">{e.items} → {e.recipient}</span> : e.note ? <span className="sub">{e.note}</span> : null}</td>
                      <td><i className="dot" style={{ background: data.goals.find((g) => g.id === e.goalId)?.color ?? "var(--ink-3)" }} />{goalTitle(e.goalId)}</td>
                      <td>{when(e.occurredAt)}</td>
                      <td className={`r num ledger-${e.kind}`}>{e.kind === "in" ? "+" : e.kind === "out" ? "−" : "≈"}{fmt(e.amount)} ETB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="apanel span2">
          <div className="ahead">
            <h2>Goals</h2>
            <span className="quiet">what the money is for; each one is a constellation on the page</span>
            <button type="button" className="abtn" style={{ marginLeft: "auto" }} onClick={() => openGoal(null)}>+ Add a goal</button>
          </div>
          {data.goals.length === 0 ? (
            <p className="quiet">No goals yet. Gifts without a goal go to the general fund.</p>
          ) : (
            <div className="camps one">
              {data.goals.map((g) => (
                <button key={g.id} type="button" className="goal-row" onClick={() => openGoal(g)}>
                  <b className="sub"><i className="dot" style={{ background: g.color }} />{g.title}{g.status === "done" ? <span className="pill st-active">done</span> : null}</b>
                  <div className="bar-track"><b style={{ width: `${g.pct}%`, background: g.color }} /></div>
                  <span className="quiet num">{fmt(g.raised)} of {fmt(g.target)} ETB · {g.pct}% · spent {fmt(g.spent)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {side?.type === "entry" ? (
        <aside className="adetail" aria-label={current ? `Entry ${current.ref}` : "Log money"}>
          <div className="ahead"><h2>{current ? current.ref : "Log money"}</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setSide(null)}>×</button></div>
          {current ? <p className="quiet">Logged {when(current.at)}. The receipt number stays the same if you edit.</p> : null}
          <form className="aform" onSubmit={saveEntry}>
            <div className="kind-toggle three" role="radiogroup" aria-label="What kind of entry">
              <button type="button" role="radio" aria-checked={entry.kind === "in"} className={entry.kind === "in" ? "on in" : ""} onClick={() => setEntry({ ...entry, kind: "in" })}>＋ Money in</button>
              <button type="button" role="radio" aria-checked={entry.kind === "out"} className={entry.kind === "out" ? "on out" : ""} onClick={() => setEntry({ ...entry, kind: "out", anonymous: false })}>− Money out</button>
              <button type="button" role="radio" aria-checked={entry.kind === "inkind"} className={entry.kind === "inkind" ? "on inkind" : ""} onClick={() => setEntry({ ...entry, kind: "inkind" })}>🎁 In kind</button>
            </div>
            {entry.kind === "inkind" ? <p className="quiet">Goods handed straight to someone, not money through our hands. It never changes the balance.</p> : null}
            <label className="field"><span>{entry.kind === "inkind" ? "What it was worth (birr)" : "Amount (birr)"}</span><input type="number" inputMode="numeric" min={1} step={1} value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} required /></label>
            <label className="field"><span>{entry.kind === "out" ? "Paid to" : "From"}</span><input value={entry.name} onChange={(e) => setEntry({ ...entry, name: e.target.value })} placeholder={entry.kind === "out" ? "Shop, school, person" : "Full name, as it should show"} required /></label>
            {entry.kind === "inkind" ? (
              <>
                <label className="field"><span>What was given</span><input value={entry.items} onChange={(e) => setEntry({ ...entry, items: e.target.value })} placeholder="e.g. 4 packs of 12 diapers" required /></label>
                <label className="field"><span>Who received it</span><input value={entry.recipient} onChange={(e) => setEntry({ ...entry, recipient: e.target.value })} placeholder="e.g. One Heart Wholeness Center" required /></label>
              </>
            ) : null}
            {entry.kind !== "out" ? (
              <label className="acheck"><input type="checkbox" checked={entry.anonymous} onChange={(e) => setEntry({ ...entry, anonymous: e.target.checked })} /> They asked not to be named (shows as “Anonymous”)</label>
            ) : null}
            <label className="field"><span>For</span><select value={entry.goalId} onChange={(e) => setEntry({ ...entry, goalId: e.target.value })}><option value="">General fund</option>{data.goals.map((g) => <option key={g.id} value={g.id}>{g.title}{g.status === "done" ? " (done)" : ""}</option>)}</select></label>
            {entry.kind === "inkind" ? null : (
              <label className="field"><span>How</span><select value={entry.method} onChange={(e) => setEntry({ ...entry, method: e.target.value })}>{data.methods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
            )}
            <label className="field"><span>{entry.kind === "inkind" ? "When it was handed over" : "When it arrived or was paid"}</span><input type="datetime-local" value={entry.when} onChange={(e) => setEntry({ ...entry, when: e.target.value })} required /></label>
            <label className="field"><span>Note <em>(public)</em></span><textarea rows={2} value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} placeholder={entry.kind === "in" ? "e.g. for the reading club books" : "e.g. 40 exercise books, 20 pens"} /></label>

            <div className="field">
              <span>{entry.kind === "inkind" ? "Photo of the gift" : "Receipt photo"} <em>(public)</em></span>
              <p className="quiet receipt-warn">
                {entry.kind === "inkind"
                  ? "A photo of the goods or the handover. Ask before photographing anyone, and never publish a child’s face without their guardian’s consent."
                  : "Cover phone numbers, account numbers and signatures before you upload."}
                {entry.anonymous ? " Cover their name too, since they asked not to be named." : ""} Anyone can open this photo.
              </p>
              {entry.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview of the picked photo
                <img className="receipt-preview" src={entry.image} alt="The receipt you picked" />
              ) : current?.receipt && !entry.removeReceipt ? (
                // eslint-disable-next-line @next/next/no-img-element -- served from the database
                <img className="receipt-preview" src={`/api/ledger/receipt?ref=${encodeURIComponent(current.ref)}&v=${encodeURIComponent(current.at)}`} alt={`Receipt ${current.ref}`} />
              ) : null}
              <div className="aform-actions">
                <label className="abtn">📷 {entry.image || current?.receipt ? "Change photo" : "Add photo"}<input type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e)} /></label>
                {entry.image ? <button type="button" className="abtn ghost" onClick={() => setEntry({ ...entry, image: "" })}>Don’t use this photo</button> : null}
                {current?.receipt && !entry.image ? (
                  <label className="acheck"><input type="checkbox" checked={entry.removeReceipt} onChange={(e) => setEntry({ ...entry, removeReceipt: e.target.checked })} /> Take the photo down</label>
                ) : null}
              </div>
            </div>

            <div className="aform-actions">
              <button type="submit" className="abtn primary" disabled={busy}>{current ? "Save changes" : entry.kind === "in" ? "Log gift" : entry.kind === "out" ? "Log payment" : "Log gift in kind"}</button>
              {current ? <button type="button" className="abtn danger ghost" disabled={busy} onClick={() => removeEntry(current)}>Remove entry</button> : null}
            </div>
          </form>
        </aside>
      ) : side?.type === "goal" ? (
        <aside className="adetail" aria-label={currentGoal ? currentGoal.title : "Add a goal"}>
          <div className="ahead"><h2>{currentGoal ? currentGoal.title : "Add a goal"}</h2><button type="button" className="aclose" aria-label="Close" onClick={() => setSide(null)}>×</button></div>
          {currentGoal ? <p className="quiet num">{fmt(currentGoal.raised)} raised · {fmt(currentGoal.spent)} spent · {fmt(currentGoal.remaining)} still needed</p> : null}
          <form className="aform" onSubmit={saveGoal}>
            <label className="field"><span>Name</span><input value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} placeholder="e.g. Books for the reading club" required /></label>
            <label className="field"><span>Target (birr)</span><input type="number" inputMode="numeric" min={0} step={1} value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} required /></label>
            <div className="field">
              <span>Colour on the sky</span>
              <div className="swatches" role="radiogroup" aria-label="Colour">
                {data.colors.map((c) => <button key={c} type="button" role="radio" aria-checked={goal.color === c} aria-label={c} className={goal.color === c ? "on" : ""} style={{ background: c }} onClick={() => setGoal({ ...goal, color: c })} />)}
              </div>
            </div>
            <label className="field"><span>Why we need it</span><textarea rows={3} value={goal.about} onChange={(e) => setGoal({ ...goal, about: e.target.value })} /></label>
            <label className="field"><span>The plan: what we’ll do with it</span><textarea rows={4} value={goal.plan} onChange={(e) => setGoal({ ...goal, plan: e.target.value })} /></label>
            <label className="acheck"><input type="checkbox" checked={goal.status === "done"} onChange={(e) => setGoal({ ...goal, status: e.target.checked ? "done" : "open" })} /> Done (stops counting towards “still needed”)</label>
            <div className="aform-actions"><button type="submit" className="abtn primary" disabled={busy}>{currentGoal ? "Save goal" : "Add goal"}</button></div>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
