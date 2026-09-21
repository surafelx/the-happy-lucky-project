"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell, useHashTab } from "@/components/AdminShell";
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

const TABS = [
  { key: "overview", label: "Overview", icon: "▦" },
  { key: "sundays", label: "My Sundays", icon: "📅" },
  { key: "group", label: "My group", icon: "👧" },
  { key: "badge", label: "Badge", icon: "🏅" },
  { key: "messages", label: "Messages", icon: "💬" },
];
const day = (iso: string, long = false) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
const CLUB_LABEL: Record<string, string> = { coding: "Coding club", reading: "Reading club", art: "Art club", science: "Science corner", general: "Homework hour" };


function RsvpRow({ date, current, onRsvp }: { date: string; current: "yes" | "no" | null; onRsvp: (date: string, answer: "yes" | "no") => void }) {
  return (
    <div className="rsvp">
      <button className={`abtn${current === "yes" ? " primary" : ""}`} type="button" onClick={() => onRsvp(date, "yes")}>
        {current === "yes" ? "\u2713 You\u2019re coming" : "I\u2019ll be there"}
      </button>
      <button className={`abtn${current === "no" ? " muted" : ""}`} type="button" onClick={() => onRsvp(date, "no")}>
        {current === "no" ? "\u2713 Can\u2019t make it" : "Can\u2019t make it"}
      </button>
    </div>
  );
}

export function MeDashboard() {
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useHashTab("overview", TABS.map((t) => t.key));
  const router = useRouter();

  const load = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    setData((await res.json().catch(() => null)) as Me | null);
    setLoading(false);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const rsvp = async (date: string, answer: "yes" | "no") => {
    const res = await fetch("/api/me/rsvp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, answer }) });
    if (!res.ok) return toast("Couldn’t save that. Try again.");
    if (answer === "yes") burst(undefined, undefined, 80);
    toast(answer === "yes" ? "See you Sunday! 🍀" : "Noted. Next Sunday, then.");
    void load();
  };
  const signOut = async () => {
    await fetch("/api/me", { method: "DELETE" });
    router.push("/");
  };

  const signedOut = !loading && !data?.signedIn;
  useEffect(() => {
    if (signedOut) router.replace("/enter");
  }, [signedOut, router]);

  if (loading) return <p className="office-empty">Opening your Sundays…</p>;
  if (!data?.signedIn) return <p className="office-empty">Taking you to the door…</p>;

  const { me, next, badge } = data;
  const pct = Math.round((badge.done / badge.total) * 100);
  const unread = data.messages.length;

  return (
    <AdminShell
      product="Your Sundays"
      tabs={TABS.map((t) => ({ ...t, badge: t.key === "messages" ? unread || undefined : undefined }))}
      active={tab}
      onTab={setTab}
      who={{ name: me.name, role: `${STATUS_LABEL[me.status]} · ${CLUB_LABEL[me.club]}`, initial: me.first[0]?.toUpperCase() ?? "?" }}
      onSignOut={signOut}
      actions={<span className={`pill st-${me.status}`}>{me.status === "contacted" ? "Induction booked" : STATUS_LABEL[me.status]}</span>}
    >
      {tab === "overview" ? (
        <div className="agrid">
          <div className="apanel span2 hero-panel">
            <p className="eyebrow rose">Next Sunday · {next.kindLabel}</p>
            <h2 className="big">{day(next.date, true)} · {next.slot.time}</h2>
            <p className="sub">
              {next.induction ? "Your induction first, then " : ""}
              {next.slot.title} with {next.slot.lead === me.first ? "you leading" : `${next.slot.lead} as lead`}. Sunday learning centre, Addis Ababa, or the online room.
            </p>
            <RsvpRow date={next.date} current={next.rsvp} onRsvp={(d, a) => void rsvp(d, a)} />
            <div className="slots">{next.slots.map((s) => <span key={s.time + s.title}><b>{s.time}</b> {s.title} · {s.lead}</span>)}</div>
            <p className="quiet">Bring nothing. Tea is on us. A laptop helps for coding club.</p>
          </div>
          <div className="apanel">
            <div className="ahead"><h2>Getting started</h2><span className="quiet">{data.steps.filter((s) => s.done).length} of {data.steps.length}</span></div>
            <div className="check">
              {data.steps.map((s, i) => <div key={s.key}><i className={s.done ? "done" : s.current ? "now" : ""}>{s.done ? "✓" : s.current ? "●" : i + 1}</i><span>{s.label}</span><small>{s.done ? "done" : s.current ? "next" : ""}</small></div>)}
            </div>
          </div>
          <div className="apanel">
            <div className="ahead"><h2>At a glance</h2></div>
            <div className="kpis three">
              <div className="kpi"><b className="num">{data.attended.length}</b><span>Sundays</span></div>
              <div className="kpi"><b className="num">{data.hoursWithKids}h</b><span>with kids</span></div>
              <div className="kpi"><b className="num">{data.kids.length}</b><span>kids waiting</span></div>
            </div>
            <div className="bar-track"><b style={{ width: `${pct}%` }} /></div>
            <p className="quiet">Badge: {badge.done} of {badge.total} steps</p>
          </div>
          <div className="apanel span2">
            <div className="ahead"><h2>From the centre</h2></div>
            <div className="msgs">{data.messages.slice(0, 2).map((m, i) => <div className="msg" key={i}>{m.text}<small>{m.from} · {new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></div>)}</div>
          </div>
        </div>
      ) : null}

      {tab === "sundays" ? (
        <div className="agrid">
          {[{ date: next.date, kindLabel: next.kindLabel, rsvp: next.rsvp, slots: next.slots }, ...data.upcoming.map((u) => ({ ...u, slots: [] as typeof next.slots }))].map((s, i) => (
            <div key={s.date} className={`apanel${i === 0 ? " span2" : ""}`}>
              <div className="ahead"><h2>{day(s.date, true)}</h2><span className="quiet">{s.kindLabel}</span></div>
              {s.slots.length ? <div className="slots">{s.slots.map((x) => <span key={x.time + x.title}><b>{x.time}</b> {x.title} · {x.lead}</span>)}</div> : <p className="quiet">The plan appears the week before.</p>}
              <RsvpRow date={s.date} current={s.rsvp} onRsvp={(d, a) => void rsvp(d, a)} />
              {data.attended.includes(s.date) ? <span className="pill st-active">★ Attended</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {tab === "group" ? (
        <div className="apanel narrow">
          <div className="ahead"><h2>{CLUB_LABEL[me.club]}</h2><span className="quiet">{data.kids.length} kids · example roster</span></div>
          <div className="kids">{data.kids.map((k) => <div className="kid" key={k.name}><i>{k.name[0]}</i><div>{k.name}, {k.age}<small>{k.note}</small></div></div>)}</div>
          <p className="quiet">First names only. Never share these outside the centre.</p>
        </div>
      ) : null}

      {tab === "badge" ? (
        <div className="apanel narrow">
          <div className="ahead"><h2>Big Sibling · {CLUB_LABEL[me.club].split(" ")[0]}</h2><span className="quiet">unlocks after induction + 4 Sundays</span></div>
          <div className={`badge${badge.unlocked ? " unlocked" : ""}`}>
            <div className="coin">{me.hasPhoto ? <span className="face">😊</span> : <Logo />}</div>
            <div>
              <div className="bar-track"><b style={{ width: `${pct}%` }} /></div>
              <p className="quiet">{badge.unlocked ? "Unlocked. Wear it." : `${badge.done} of ${badge.total} steps${me.hasPhoto ? " · your smiling photo is ready for it" : " · add a smiling photo any time"}`}</p>
            </div>
          </div>
          <div className="check">
            {data.steps.map((s, i) => <div key={s.key}><i className={s.done ? "done" : s.current ? "now" : ""}>{s.done ? "✓" : s.current ? "●" : i + 1}</i><span>{s.label}</span><small>{s.done ? "done" : s.current ? "next" : ""}</small></div>)}
            {[1, 2, 3, 4].map((n) => <div key={n}><i className={data.attended.length >= n ? "done" : ""}>{data.attended.length >= n ? "✓" : n}</i><span>Sunday {n} with kids</span><small>{data.attended[n - 1] ? day(data.attended[n - 1]) : ""}</small></div>)}
          </div>
        </div>
      ) : null}

      {tab === "messages" ? (
        <div className="apanel narrow">
          <div className="ahead"><h2>From the centre</h2></div>
          <div className="msgs">{data.messages.map((m, i) => <div className="msg" key={i}>{m.text}<small>{m.from} · {new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></div>)}</div>
          <div className="office-actions"><span className="abtn">Club plan (PDF)</span><Link className="abtn" href="/sundays">Read the Sunday letters</Link></div>
        </div>
      ) : null}
    </AdminShell>
  );
}
