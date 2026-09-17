"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import { STATUS_LABEL } from "@/lib/office";
import type { MentorStatus } from "@/lib/office";
import { burst, toast } from "@/lib/format";
import { Logo } from "@/components/SvgDefs";

type Me = {
  ok: boolean; signedIn: boolean;
  me: { id: string; name: string; first: string; email: string; since: string; status: MentorStatus; club: string; share: string[]; contribute: string[]; hasPhoto: boolean };
  steps: { key: string; label: string; done: boolean; current: boolean }[];
  badge: { done: number; total: number; unlocked: boolean };
  attended: string[]; hoursWithKids: number;
  next: { date: string; kind: string; kindLabel: string; slot: { time: string; title: string; lead: string }; slots: { time: string; title: string; lead: string }[]; rsvp: "yes" | "no" | null; induction: boolean };
  upcoming: { date: string; kind: string; kindLabel: string; rsvp: "yes" | "no" | null }[];
  kids: { name: string; age: number; note: string }[];
  messages: { from: string; at: string; text: string }[];
};

const day = (iso: string, long = false) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
const CLUB_LABEL: Record<string, string> = { coding: "Coding club", reading: "Reading club", art: "Art club", science: "Science corner", general: "Homework hour" };
const STATUS_ICON: Record<MentorStatus, string> = { new: "●", contacted: "✉", inducted: "✓", active: "★" };

export function MeDashboard() {
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    setData((await res.json().catch(() => null)) as Me | null);
    setLoading(false);
  }, []);
  useEffect(() => {
    // Loading runs in a callback (after the first await), never synchronously in the effect body.
    void Promise.resolve().then(load);
  }, [load]);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !d.ok) return setErr(d.error || "That didn’t work. Try again.");
    await load();
  };
  const signOut = async () => {
    await fetch("/api/me", { method: "DELETE" });
    setData(null);
  };
  const rsvp = async (date: string, answer: "yes" | "no") => {
    const res = await fetch("/api/me/rsvp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, answer }) });
    if (!res.ok) return toast("Couldn’t save that. Try again.");
    if (answer === "yes") burst(undefined, undefined, 80);
    toast(answer === "yes" ? "See you Sunday! 🍀" : "Noted. Next Sunday, then.");
    void load();
  };

  if (loading) return <p className="office-empty">Opening your Sundays…</p>;

  if (!data?.signedIn) {
    return (
      <div className="office-gate">
        <form className="card lift" onSubmit={signIn}>
          <Logo className="gate-logo" />
          <span className="eyebrow">Your Sundays</span>
          <h2>Which email did you use?</h2>
          <p className="note">The one from the mentor form. That&apos;s all we need to find you.</p>
          <input id="me-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
          {err ? <p className="msg err">🍀 {err}</p> : null}
          <button className="btn rose" type="submit">Find my Sundays</button>
          <p className="quiet">Haven&apos;t filled the form? <Link href="/mentor">Become a big sibling</Link> first.</p>
        </form>
      </div>
    );
  }

  const { me, next, badge } = data;
  const pct = Math.round((badge.done / badge.total) * 100);

  return (
    <div className="office me">
      <div className="office-head">
        <div>
          <p className="eyebrow">Big sibling since {day(me.since)}</p>
          <h1>Hey {me.first}, Sunday&apos;s coming.</h1>
        </div>
        <div className="office-actions">
          <span className={`pill st-${me.status}`}>{STATUS_ICON[me.status]} {me.status === "contacted" ? "Induction booked" : STATUS_LABEL[me.status]}</span>
          <button className="btn sm ghost" type="button" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>

      <div className="office-main me-main">
        <section className="card lift next">
          <p className="eyebrow rose">Next Sunday · {next.kindLabel}</p>
          <h3>{day(next.date, true)} · {next.slot.time}</h3>
          <p className="sub">
            {next.induction ? "Your induction first, then " : ""}
            {next.slot.title} with {next.slot.lead === me.first ? "you leading" : `${next.slot.lead} as lead`}. Sunday learning centre, Addis Ababa, or the online room.
          </p>
          <div className="rsvp">
            <button className={`btn ${next.rsvp === "yes" ? "gold" : ""}`} type="button" onClick={() => void rsvp(next.date, "yes")}>{next.rsvp === "yes" ? "✓ You’re coming" : "I’ll be there"}</button>
            <button className={`btn ghost${next.rsvp === "no" ? " on" : ""}`} type="button" onClick={() => void rsvp(next.date, "no")}>{next.rsvp === "no" ? "✓ Can’t make it" : "Can’t make it"}</button>
          </div>
          <div className="slots">{next.slots.map((s) => <span key={s.time + s.title}><b>{s.time}</b> {s.title} · {s.lead}</span>)}</div>
          <p className="quiet">Bring nothing. Tea is on us. A laptop helps for coding club.</p>
        </section>

        <section className="card">
          <h3>Getting started</h3>
          <div className="check">
            {data.steps.map((s, i) => (
              <div key={s.key}><i className={s.done ? "done" : s.current ? "now" : ""}>{s.done ? "✓" : s.current ? "●" : i + 1}</i><span>{s.label}</span><small>{s.done ? "done" : s.current ? "next" : ""}</small></div>
            ))}
          </div>
        </section>
      </div>

      <div className="office-bottom">
        <section className="card">
          <h3>Your group</h3><p className="sub">{CLUB_LABEL[me.club]} · {data.kids.length} kids</p>
          <div className="kids">
            {data.kids.map((k) => <div className="kid" key={k.name}><i>{k.name[0]}</i><div>{k.name}, {k.age}<small>{k.note}</small></div></div>)}
          </div>
          <p className="quiet">Example roster. First names only; never share these outside the centre.</p>
        </section>

        <section className="card">
          <h3>Your badge</h3><p className="sub">Unlocks after induction + 4 Sundays</p>
          <div className={`badge${badge.unlocked ? " unlocked" : ""}`}>
            <div className="coin">{me.hasPhoto ? <span className="face">😊</span> : <Logo />}</div>
            <div>
              <b className="lucky">Big Sibling · {CLUB_LABEL[me.club].split(" ")[0]}</b>
              <div className="bar-track"><b style={{ width: `${pct}%` }} /></div>
              <p className="quiet">{badge.unlocked ? "Unlocked. Wear it." : `${badge.done} of ${badge.total} steps${me.hasPhoto ? " · your smiling photo is ready for it" : " · add a smiling photo any time"}`}</p>
            </div>
          </div>
          <div className="kpis three">
            <div className="kpi"><b className="num">{data.attended.length}</b><span>Sundays</span></div>
            <div className="kpi"><b className="num">{data.hoursWithKids}h</b><span>with kids</span></div>
            <div className="kpi"><b className="num">{data.kids.length}</b><span>kids waiting</span></div>
          </div>
          {data.upcoming.length ? (
            <div className="upcoming">
              {data.upcoming.map((u) => (
                <span key={u.date} className="pill">
                  {day(u.date)} · {u.kindLabel}
                  <button type="button" className={`mini${u.rsvp === "yes" ? " on" : ""}`} onClick={() => void rsvp(u.date, "yes")} aria-label={`Yes to ${u.date}`}>yes</button>
                  <button type="button" className={`mini${u.rsvp === "no" ? " on" : ""}`} onClick={() => void rsvp(u.date, "no")} aria-label={`No to ${u.date}`}>no</button>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card">
          <h3>From the centre</h3>
          <div className="msgs">
            {data.messages.map((m, i) => <div className="msg" key={i}>{m.text}<small>{m.from} · {new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></div>)}
          </div>
          <div className="office-actions"><span className="btn sm">Club plan (PDF)</span><Link className="btn sm ghost" href="/sundays/sunday-0">Read Sunday 0</Link></div>
        </section>
      </div>
    </div>
  );
}
