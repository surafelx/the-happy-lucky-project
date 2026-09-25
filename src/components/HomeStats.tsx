"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { JOINED_EVENT } from "@/components/JoinCount";
import { useCountUp } from "@/lib/count-up";

type Money = { balance: number; given: number; needed: number; givers: number };
const fmt = (n: number) => n.toLocaleString("en-US");
const POLL_MS = 30_000;

/**
 * The home page numbers, people and money together. Each tile appears only
 * once it has a real number behind it: the join count needs a counter source,
 * volunteers and money need the database, and money needs a first entry.
 */
export function HomeStats() {
  const [joined, setJoined] = useState<number | null>(null);
  const [goal, setGoal] = useState(50);
  const [volunteers, setVolunteers] = useState<number | null>(null);
  const [money, setMoney] = useState<Money | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetch("/api/join/count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { count?: number | null; goal?: number }) => {
          if (!alive) return;
          if (typeof d.goal === "number" && d.goal > 0) setGoal(d.goal);
          // Never count backwards: the join count is cached for a few seconds.
          if (typeof d.count === "number") setJoined((c) => Math.max(c ?? 0, d.count as number));
        })
        .catch(() => {});
      void fetch("/api/stats", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { ok?: boolean; volunteers?: number; money?: Money | null } | null) => {
          if (!alive || !d?.ok) return;
          setVolunteers(typeof d.volunteers === "number" ? d.volunteers : null);
          setMoney(d.money ?? null);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onJoined = (e: Event) => {
      const d = (e as CustomEvent<{ position: number | null; already: boolean }>).detail;
      if (!d || d.already) return;
      setJoined((c) => (d.position ? Math.max(c ?? 0, d.position) : (c ?? 0) + 1));
    };
    window.addEventListener(JOINED_EVENT, onJoined);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(JOINED_EVENT, onJoined);
    };
  }, []);

  const people = useCountUp(joined ?? 0, 900);
  const helpers = useCountUp(volunteers ?? 0, 900);
  const balance = useCountUp(money?.balance ?? 0);
  const given = useCountUp(money?.given ?? 0);
  const needed = useCountUp(money?.needed ?? 0);

  if (joined === null && volunteers === null && money === null) return null;
  const reached = joined !== null && joined >= goal;
  const pct = joined === null ? 0 : Math.min(100, Math.round((joined / goal) * 100));

  return (
    <div className="jstats">
      <div className="jsplit">
        {joined !== null ? (
          <div className="jbig">
            <span><i className="live-dot" aria-hidden="true" /> People</span>
            <b className="num">{fmt(people)}<small>of {goal}</small></b>
            <em>{reached ? "first month, goal reached 🎉" : "joined this month"}</em>
            <div className="jtrack" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(joined, goal)} aria-label={`${joined} of ${goal} people have joined`}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}
        {money ? (
          <div className="jbig money">
            <span>We have now</span>
            <b className="num">{fmt(balance)}<small>ETB</small></b>
            <em>{fmt(given)} given in {money.givers} {money.givers === 1 ? "gift" : "gifts"}</em>
          </div>
        ) : null}
      </div>
      {money || volunteers ? (
        <p className="jfoot">
          <span>
            {volunteers ? <><b className="num">{fmt(helpers)}</b> offered to help</> : null}
            {volunteers && money?.needed ? " · " : null}
            {money?.needed ? <><b className="num">{fmt(needed)} ETB</b> still needed</> : null}
          </span>
          {money ? <Link href="/audit">See every birr →</Link> : null}
        </p>
      ) : null}
    </div>
  );
}
